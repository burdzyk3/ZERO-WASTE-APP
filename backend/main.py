from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union
import ollama
import json
import re

app = FastAPI(title="Zero Waste AI Backend")

# Konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FridgeItem(BaseModel):
    name: str
    daysLeft: int
    icon: Optional[str] = "Apple"

class RecipeRequest(BaseModel):
    model_config = {'protected_namespaces': ()}
    items: List[FridgeItem]
    model_name: Optional[str] = "llama3.2"

class RecipeResponse(BaseModel):
    title: str
    description: str
    ingredients: List[str]
    steps: str

class AnalyzeRequest(BaseModel):
    model_config = {'protected_namespaces': ()}
    text: str
    model_name: Optional[str] = "llama3.2"

# Słownik heurystyczny
HEURISTIC_DATABASE = {
    "mleko": {"daysLeft": 5, "icon": "Milk"},
    "jogurt": {"daysLeft": 7, "icon": "Milk"},
    "ser": {"daysLeft": 10, "icon": "Milk"},
    "twarog": {"daysLeft": 5, "icon": "Milk"},
    "smietana": {"daysLeft": 6, "icon": "Milk"},
    "kurczak": {"daysLeft": 2, "icon": "Egg"},
    "piers z kurczaka": {"daysLeft": 2, "icon": "Egg"},
    "mieso": {"daysLeft": 3, "icon": "Egg"},
    "szynka": {"daysLeft": 5, "icon": "Egg"},
    "ryba": {"daysLeft": 2, "icon": "Egg"},
    "jajka": {"daysLeft": 14, "icon": "Egg"},
    "jajko": {"daysLeft": 14, "icon": "Egg"},
    "pomidor": {"daysLeft": 4, "icon": "Carrot"},
    "pomidory": {"daysLeft": 4, "icon": "Carrot"},
    "marchew": {"daysLeft": 14, "icon": "Carrot"},
    "marchewka": {"daysLeft": 14, "icon": "Carrot"},
    "sałata": {"daysLeft": 3, "icon": "Carrot"},
    "ogorek": {"daysLeft": 7, "icon": "Carrot"},
    "ogorki": {"daysLeft": 7, "icon": "Carrot"},
    "ziemniaki": {"daysLeft": 30, "icon": "Carrot"},
    "cebula": {"daysLeft": 20, "icon": "Carrot"},
    "czosnek": {"daysLeft": 30, "icon": "Carrot"},
    "banan": {"daysLeft": 4, "icon": "Apple"},
    "banany": {"daysLeft": 4, "icon": "Apple"},
    "jablko": {"daysLeft": 21, "icon": "Apple"},
    "jablka": {"daysLeft": 21, "icon": "Apple"},
    "gruszka": {"daysLeft": 7, "icon": "Apple"},
    "chleb": {"daysLeft": 4, "icon": "Apple"},
    "maslo": {"daysLeft": 14, "icon": "Milk"},
    "makaron": {"daysLeft": 365, "icon": "Apple"},
    "kasza": {"daysLeft": 365, "icon": "Apple"},
    "ryz": {"daysLeft": 365, "icon": "Apple"},
    "maka": {"daysLeft": 365, "icon": "Apple"},
    "cukier": {"daysLeft": 730, "icon": "Apple"},
    "sol": {"daysLeft": 730, "icon": "Apple"},
    "olej": {"daysLeft": 365, "icon": "Apple"},
    "puszka": {"daysLeft": 365, "icon": "Apple"},
    "konserwa": {"daysLeft": 365, "icon": "Apple"},
    "kawa": {"daysLeft": 365, "icon": "Apple"},
    "herbata": {"daysLeft": 365, "icon": "Apple"},
    "platki": {"daysLeft": 180, "icon": "Apple"}
}

def clean_text(text: str) -> str:
    translations = str.maketrans("ąćęłńóśźż", "acelnoszz")
    return text.lower().translate(translations).strip()

def get_heuristic_estimate(product_name: str) -> Optional[dict]:
    cleaned = clean_text(product_name)
    if cleaned in HEURISTIC_DATABASE:
        return HEURISTIC_DATABASE[cleaned]
    for key, val in HEURISTIC_DATABASE.items():
        if key in cleaned or cleaned in key:
            return val
    return None

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Zero Waste AI Backend is running!"}

# Listy do walidacji danych wejściowych
SWEAR_WORDS = [
    "chuj", "huj", "kurw", "pierd", "jeb", "pizd", "kutas", "srak", "sraj", "gówn", "gown",
    "fiut", "cwel", "suka", "dziwk", "pizd"
]

NON_FOOD_KEYWORDS = [
    "farba", "benzyna", "cement", "piasek", "but", "buty", "telefon", "laptop", "komputer",
    "kabel", "papier", "mydło", "mydlo", "szampon", "plyn", "płyn", "proszek", "beton",
    "cegła", "cegla", "kamień", "kamien", "drzewo", "plastik", "metal", "szkło", "szklo",
    "farby", "gwozdzie", "gwoździe", "młotek", "mlotek", "śrubokręt", "srubokret"
]

@app.post("/api/analyze-items", response_model=List[FridgeItem])
def analyze_items(request: AnalyzeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Brak wprowadzonych produktów.")
    
    raw_products = [p.strip() for p in re.split(r'[,;+\n]', request.text) if p.strip()]
    
    # Walidacja wulgaryzmów i niejadalnych przedmiotów
    for prod in raw_products:
        cleaned_prod = clean_text(prod)
        if any(word in cleaned_prod for word in SWEAR_WORDS):
            raise HTTPException(
                status_code=400,
                detail="Wykryto nieodpowiednie słownictwo! Wprowadź poprawne produkty spożywcze."
            )
        if any(word in cleaned_prod for word in NON_FOOD_KEYWORDS):
            raise HTTPException(
                status_code=400,
                detail=f"Produkt '{prod}' nie wygląda na artykuł spożywczy! Wprowadzaj tylko jedzenie."
            )

    # Wszystkie produkty idą przez model AI
    prompt = (
        "Jesteś ekspertem ds. żywności i diety. Dla każdego produktu spożywczego z poniższej listy "
        "podaj realistyczną liczbę dni przydatności do spożycia od momentu zakupu (daysLeft) "
        "oraz przypisz odpowiednią ikonę.\n\n"
        "WAŻNE ZASADY SZACOWANIA TRWAŁOŚCI:\n"
        "- Świeże mięso (kurczak, wołowina, wieprzowina): 2-3 dni\n"
        "- Wędliny, szynka, parówki (opakowane): 5-7 dni\n"
        "- Świeże ryby: 1-2 dni\n"
        "- Mleko świeże: 4-5 dni\n"
        "- Jogurt, kefir: 7-14 dni\n"
        "- Ser żółty: 14-21 dni\n"
        "- Ser biały, twaróg: 5-7 dni\n"
        "- Jajka: 28 dni\n"
        "- Świeże warzywa (pomidory, sałata): 3-5 dni\n"
        "- Twarde warzywa (marchew, buraki): 14-21 dni\n"
        "- Owoce miękkie (truskawki, maliny): 2-3 dni\n"
        "- Owoce twarde (jabłka, gruszki): 14-21 dni\n"
        "- Banany: 4-5 dni\n"
        "- Chleb świeży: 3-4 dni\n"
        "- Makaron suchy, ryż, kasza, mąka: 365 dni\n"
        "- Konserwy, puszki: 365 dni\n"
        "- Pesto, sosy w słoiku (otwarte): 7-14 dni\n"
        "- Pesto, sosy w słoiku (nieotwarte): 180 dni\n"
        "- Masło: 30 dni\n"
        "- Olej, oliwa: 180 dni\n\n"
        "Ikony do przypisania:\n"
        "- 'Milk': nabiał (mleko, ser, jogurt, masło, śmietana)\n"
        "- 'Egg': mięso, ryby, jajka, wędliny\n"
        "- 'Carrot': warzywa\n"
        "- 'Apple': owoce, pieczywo, suche produkty, przetwory\n\n"
        "Lista produktów do analizy:\n"
        f"{', '.join(raw_products)}\n\n"
        "Odpowiedz TYLKO jako tablica JSON:\n"
        "[\n"
        "  {\n"
        '    "name": "Pełna nazwa produktu",\n'
        '    "daysLeft": 365,\n'
        '    "icon": "Apple"\n'
        "  }\n"
        "]\n"
        "Żadnego tekstu przed ani po. Tylko JSON."
    )

    try:
        response = ollama.chat(
            model=request.model_name,
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'Jesteś ekspertem od przechowywania żywności. '
                        'Znasz dokładne czasy przydatności do spożycia wszystkich produktów spożywczych. '
                        'Odpowiadasz WYŁĄCZNIE tablicą obiektów JSON, bez żadnego dodatkowego tekstu.'
                    )
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            options={'temperature': 0.1},
            format='json'
        )

        content = response['message']['content']
        print("Ollama analyze response:", content)

        llm_items = json.loads(content)

        # Upewnij się że to lista
        if isinstance(llm_items, dict):
            found_array = None
            for k, v in llm_items.items():
                if isinstance(v, list):
                    found_array = v
                    break
            llm_items = found_array if found_array is not None else [llm_items]

        if not isinstance(llm_items, list):
            llm_items = []

        analyzed_items = []
        for item_data in llm_items:
            if not isinstance(item_data, dict):
                continue

            icon = item_data.get("icon", "Apple")
            name = str(item_data.get("name", "Produkt")).capitalize()

            raw_days = item_data.get("daysLeft", 7)
            try:
                if isinstance(raw_days, str):
                    nums = re.findall(r'\d+', raw_days)
                    days_left = int(nums[0]) if nums else 7
                else:
                    days_left = int(raw_days)
            except Exception:
                days_left = 7

            if days_left <= 0:
                days_left = 1

            if icon not in ["Milk", "Egg", "Carrot", "Apple"]:
                icon = "Apple"

            analyzed_items.append(FridgeItem(
                name=name,
                daysLeft=days_left,
                icon=icon
            ))

        return analyzed_items

    except Exception as e:
        print("Ollama Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Błąd AI podczas analizy produktów: {str(e)}"
        )

@app.post("/api/generate-recipe", response_model=RecipeResponse)
def generate_recipe(request: RecipeRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Lodówka jest pusta! Dodaj jakieś składniki.")
    
    ingredients_str = ""
    for item in request.items:
        ingredients_str += f"- {item.name} (zostało dni: {item.daysLeft})\n"
        
    prompt = (
        "Jesteś doświadczonym szefem kuchni. Twoim zadaniem jest stworzenie BARDZO SMACZNEGO i sensownego przepisu kulinarnego.\n"
        "Oto składniki, które mam w lodówce (zwróć uwagę na te, które psują się najszybciej - mają mało dni ważności):\n"
        f"{ingredients_str}\n\n"
        "WAŻNE ZASADY KULINARNE:\n"
        "1. Użyj składników z lodówki, ale NIE MUSISZ ograniczać się tylko do nich.\n"
        "2. Śmiało dodawaj podstawowe składniki (sól, pieprz, oliwa, masło, czosnek, cebula, mąka, woda, przyprawy), aby danie miało prawdziwy smak.\n"
        "3. Możesz zasugerować dokupienie 1 lub 2 kluczowych produktów (np. śmietana, ryż), jeśli znacznie poprawią one jakość dania.\n"
        "4. Używaj naturalnej, poprawnej polszczyzny kulinarnej. Unikaj dziwnych kalek językowych (np. pisz 'pokrój', 'podsmaż na patelni', 'dopraw do smaku').\n\n"
        "Musisz odpowiedzieć wyłącznie w formacie JSON o poniższej strukturze:\n"
        "{\n"
        '  "title": "Nazwa przepisu (brzmiąca smakowicie)",\n'
        '  "description": "Krótkie wyjaśnienie, dlaczego ten przepis jest świetny i jak ratuje psujące się składniki.",\n'
        '  "ingredients": [\n'
        '    "Składnik z ilością (włączając te podstawowe i ewentualnie dokupione)"\n'
        '  ],\n'
        '  "steps": "Dokładna instrukcja przygotowania krok po kroku. Używaj poprawnej gramatyki i terminologii kulinarnej."\n'
        "}\n\n"
        "Odpowiedz wyłącznie w języku polskim. Zwróć tylko czysty obiekt JSON, bez żadnego dodatkowego tekstu."
    )
    
    try:
        response = ollama.chat(
            model=request.model_name,
            messages=[
                {
                    'role': 'system',
                    'content': 'Jesteś profesjonalnym polskim szefem kuchni. Twoje przepisy są sensowne, pyszne i opisywane nienaganną, naturalną polszczyzną kulinarną. Odpowiadasz wyłącznie formatem JSON.'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            options={
                'temperature': 0.7
            },
            format='json'
        )
        
        content = response['message']['content']
        print("Model raw recipe response:", content)
        recipe_data = json.loads(content)
        
        # OBRÓBKA DANYCH DLA UNIKNIĘCIA BŁĘDÓW SŁABSZYCH MODELI AI
        # Mniejsze modele mogą zwrócić składniki jako słowniki zamiast stringów (np. [{"ingredient": "Kiełbasa", "quantity": "90 g"}])
        raw_ingredients = recipe_data.get("ingredients", [])
        clean_ingredients = []
        for ing in raw_ingredients:
            if isinstance(ing, dict):
                # Jeśli model wypluł słownik, szukamy wszelkich możliwych kluczy dla nazwy składnika
                name = ing.get("name", 
                       ing.get("nazwa", 
                       ing.get("ingredient", 
                       ing.get("składnik", 
                       ing.get("skladnik", 
                       ing.get("item", 
                       ing.get("product", "Składnik")))))))
                       
                # Szukamy wszelkich możliwych kluczy dla ilości
                quantity = ing.get("quantity", 
                           ing.get("amount", 
                           ing.get("quantity_or_measure", 
                           ing.get("ilość", 
                           ing.get("ilosc", 
                           ing.get("miara", ""))))))
                           
                if quantity:
                    clean_ingredients.append(f"{name} ({quantity})")
                else:
                    clean_ingredients.append(name)
            elif isinstance(ing, str):
                clean_ingredients.append(ing)
            else:
                clean_ingredients.append(str(ing))
                
        raw_steps = recipe_data.get("steps", "Brak kroków.")
        if isinstance(raw_steps, list):
            clean_steps = "\n".join(str(s) for s in raw_steps)
        else:
            clean_steps = str(raw_steps)
            
        return RecipeResponse(
            title=recipe_data.get("title", "Szybki przepis Zero Waste"),
            description=recipe_data.get("description", "Przepis wygenerowany z Twoich składników."),
            ingredients=clean_ingredients,
            steps=clean_steps
        )
        
    except json.JSONDecodeError as je:
        print("Failed to parse JSON:", content)
        raise HTTPException(
            status_code=500, 
            detail=f"Lokalny model AI zwrócił nieprawidłowy format danych: {str(je)}"
        )
    except Exception as e:
        print("Ollama communication error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Błąd komunikacji z lokalnym AI (Ollama): {str(e)}"
        )
