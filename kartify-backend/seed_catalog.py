"""Seed the product_catalog table with 50 Indian FMCG products."""
from services.supabase import supabase

SEED_DATA = [
    {"canonical_name": "Amul Gold Full Cream Milk", "brand": "Amul", "unit": "1l", "raw_names": "gold milk|amul milk 1l|full cream milk", "aliases": "amul gold|gold milk|full cream milk"},
    {"canonical_name": "Amul Butter", "brand": "Amul", "unit": "500g", "raw_names": "amul butter|butter 500g", "aliases": "amul butter|white butter"},
    {"canonical_name": "Amul Paneer", "brand": "Amul", "unit": "200g", "raw_names": "paneer|amul paneer 200g", "aliases": "paneer|cottage cheese"},
    {"canonical_name": "Britannia Good Day Butter Cookies", "brand": "Britannia", "unit": "100g", "raw_names": "good day|butter cookies|good day cookies", "aliases": "good day|britannia cookies"},
    {"canonical_name": "Parle-G Glucose Biscuits", "brand": "Parle", "unit": "100g", "raw_names": "parle g|parle-g|glucose biscuits", "aliases": "parleg|parle g biscuits"},
    {"canonical_name": "Maggi 2-Minute Noodles Masala", "brand": "Maggi", "unit": "70g", "raw_names": "maggi noodles|maggi masala|2 minute noodles", "aliases": "maggi|instant noodles masala"},
    {"canonical_name": "Lay's Classic Salted Chips", "brand": "Lay's", "unit": "26g", "raw_names": "lays chips|lays classic|salted chips", "aliases": "lays|potato chips classic"},
    {"canonical_name": "Kurkure Masala Munch", "brand": "Kurkure", "unit": "90g", "raw_names": "kurkure|masala munch|kurkure masala", "aliases": "kurkure masala|corn puffs"},
    {"canonical_name": "Horlicks Classic Malt", "brand": "Horlicks", "unit": "500g", "raw_names": "horlicks|classic malt horlicks", "aliases": "horlicks malt|health drink"},
    {"canonical_name": "Bournvita Chocolate Health Drink", "brand": "Bournvita", "unit": "500g", "raw_names": "bournvita|cadbury bournvita|chocolate health drink", "aliases": "bournvita|cadbury health drink"},
    {"canonical_name": "Tata Salt Iodised", "brand": "Tata Salt", "unit": "1kg", "raw_names": "tata salt|iodised salt|tata iodised", "aliases": "tata salt|common salt"},
    {"canonical_name": "Aashirvaad Atta Whole Wheat", "brand": "Aashirvaad", "unit": "5kg", "raw_names": "aashirvaad atta|whole wheat atta|aashirvaad wheat", "aliases": "aashirvaad|whole wheat flour"},
    {"canonical_name": "Fortune Sunflower Oil", "brand": "Fortune", "unit": "1l", "raw_names": "sunflower oil|fortune oil|fortune sunflower", "aliases": "fortune oil|sunflower cooking oil"},
    {"canonical_name": "Engage W1 Perfume Deo For Men", "brand": "Engage", "unit": "150ml", "raw_names": "w1 perfume|engage w1|w1 deo", "aliases": "engage w1|w1 perfume men"},
    {"canonical_name": "Engage W2 Perfume Deo For Men", "brand": "Engage", "unit": "150ml", "raw_names": "w2 perfume|engage w2|w2 deo", "aliases": "engage w2|w2 perfume men"},
    {"canonical_name": "Dove Moisturising Body Wash", "brand": "Dove", "unit": "250ml", "raw_names": "dove body wash|dove shower gel|moisturising body wash", "aliases": "dove bodywash|dove shower"},
    {"canonical_name": "Head & Shoulders Anti-Dandruff Shampoo", "brand": "Head & Shoulders", "unit": "340ml", "raw_names": "head shoulders|anti dandruff shampoo|h&s shampoo", "aliases": "head and shoulders|dandruff shampoo"},
    {"canonical_name": "Colgate Maxfresh Toothpaste", "brand": "Colgate", "unit": "150g", "raw_names": "colgate maxfresh|maxfresh toothpaste|colgate toothpaste", "aliases": "colgate maxfresh|maxfresh blue"},
    {"canonical_name": "Dettol Original Liquid Handwash", "brand": "Dettol", "unit": "200ml", "raw_names": "dettol handwash|dettol liquid|original handwash", "aliases": "dettol handwash|antiseptic handwash"},
    {"canonical_name": "Vim Dishwash Liquid", "brand": "Vim", "unit": "500ml", "raw_names": "vim dishwash|vim liquid|dishwash liquid", "aliases": "vim liquid|dish cleaner"},
    {"canonical_name": "Harpic Toilet Cleaner", "brand": "Harpic", "unit": "500ml", "raw_names": "harpic toilet cleaner|harpic original|toilet cleaner", "aliases": "harpic|toilet cleaner original"},
    {"canonical_name": "Surf Excel Matic Liquid Detergent", "brand": "Surf Excel", "unit": "1l", "raw_names": "surf excel matic|surf excel liquid|matic liquid", "aliases": "surf excel|washing liquid"},
    {"canonical_name": "Ariel Matic Powder", "brand": "Ariel", "unit": "1kg", "raw_names": "ariel matic|ariel powder|matic detergent", "aliases": "ariel|washing powder"},
    {"canonical_name": "Monster Energy Drink Original", "brand": "Monster", "unit": "250ml", "raw_names": "monster energy|monster drink|energy drink monster|monster original", "aliases": "monster|energy drink can"},
    {"canonical_name": "Red Bull Energy Drink", "brand": "Red Bull", "unit": "250ml", "raw_names": "red bull|redbull|red bull energy", "aliases": "red bull|energy drink"},
    {"canonical_name": "Tropicana Orange Juice", "brand": "Tropicana", "unit": "1l", "raw_names": "tropicana orange|orange juice tropicana|tropicana juice", "aliases": "tropicana|orange juice 1l"},
    {"canonical_name": "Amul Kool Flavoured Milk", "brand": "Amul", "unit": "200ml", "raw_names": "amul kool|kool milk|flavoured milk amul", "aliases": "amul kool|chocolate milk amul"},
    {"canonical_name": "Dairy Milk Silk Chocolate", "brand": "Cadbury", "unit": "60g", "raw_names": "dairy milk silk|cadbury silk|silk chocolate", "aliases": "cadbury silk|dairy milk silk bar"},
    {"canonical_name": "KitKat Chocolate Wafer", "brand": "KitKat", "unit": "37g", "raw_names": "kitkat|kit kat|wafer chocolate kitkat", "aliases": "kitkat|kit kat wafer"},
    {"canonical_name": "Oreo Original Sandwich Cookies", "brand": "Oreo", "unit": "120g", "raw_names": "oreo cookies|original oreo|sandwich cookies", "aliases": "oreo|oreo biscuits original"},
    {"canonical_name": "Haldirams Aloo Bhujia", "brand": "Haldirams", "unit": "200g", "raw_names": "aloo bhujia|haldirams bhujia|bhujia sev", "aliases": "haldirams bhujia|aloo bhujia namkeen"},
    {"canonical_name": "Lays American Style Cream Onion", "brand": "Lay's", "unit": "26g", "raw_names": "lays cream onion|cream and onion lays|american style cream onion", "aliases": "lays cream onion|cream onion chips"},
    {"canonical_name": "Too Yumm Multigrain Chips", "brand": "Too Yumm", "unit": "55g", "raw_names": "too yumm chips|multigrain chips|too yumm multigrain", "aliases": "too yumm|baked chips multigrain"},
    {"canonical_name": "Sunfeast Dark Fantasy Choco Fills", "brand": "Sunfeast", "unit": "75g", "raw_names": "dark fantasy|choco fills|sunfeast dark fantasy", "aliases": "dark fantasy|chocolate filled biscuit"},
    {"canonical_name": "Nescafe Classic Instant Coffee", "brand": "Nescafe", "unit": "50g", "raw_names": "nescafe classic|instant coffee nescafe|nescafe coffee", "aliases": "nescafe|instant coffee classic"},
    {"canonical_name": "Tata Tea Gold", "brand": "Tata Tea", "unit": "250g", "raw_names": "tata tea gold|tata tea|tea gold", "aliases": "tata tea gold|tata chai"},
    {"canonical_name": "Brooke Bond Red Label Tea", "brand": "Brooke Bond", "unit": "250g", "raw_names": "red label tea|brooke bond red label|red label", "aliases": "red label|brooke bond tea"},
    {"canonical_name": "Lipton Yellow Label Tea", "brand": "Lipton", "unit": "250g", "raw_names": "lipton tea|yellow label tea|lipton yellow", "aliases": "lipton|lipton yellow label"},
    {"canonical_name": "Saffola Gold Cooking Oil", "brand": "Saffola", "unit": "1l", "raw_names": "saffola gold|saffola oil|cooking oil saffola", "aliases": "saffola gold|heart oil saffola"},
    {"canonical_name": "Farmlite Digestive Biscuits", "brand": "Sunfeast", "unit": "100g", "raw_names": "farmlite digestive|sunfeast farmlite|digestive biscuits", "aliases": "farmlite|digestive biscuits sunfeast"},
    {"canonical_name": "Pampers Baby Dry Pants", "brand": "Pampers", "unit": "M/24pc", "raw_names": "pampers pants|baby dry pants|pampers diapers", "aliases": "pampers pants|baby pants diapers"},
    {"canonical_name": "Himalaya Neem Face Wash", "brand": "Himalaya", "unit": "150ml", "raw_names": "himalaya neem|neem face wash himalaya|himalaya face wash", "aliases": "himalaya neem facewash|neem purifying facewash"},
    {"canonical_name": "Biotique Sunscreen SPF 50", "brand": "Biotique", "unit": "120ml", "raw_names": "biotique sunscreen|bio sandalwood spf 50|biotique spf", "aliases": "biotique sunscreen|natural sunscreen"},
    {"canonical_name": "Parachute Coconut Oil", "brand": "Parachute", "unit": "500ml", "raw_names": "parachute oil|coconut oil parachute|parachute coconut", "aliases": "parachute|coconut hair oil"},
    {"canonical_name": "Pond's Cold Cream", "brand": "Pond's", "unit": "100g", "raw_names": "ponds cold cream|ponds cream|cold cream ponds", "aliases": "ponds cream|cold cream moisturiser"},
    {"canonical_name": "Listerine Cool Mint Mouthwash", "brand": "Listerine", "unit": "250ml", "raw_names": "listerine mouthwash|cool mint listerine|listerine cool mint", "aliases": "listerine|mouthwash cool mint"},
    {"canonical_name": "Gillette Mach3 Razor", "brand": "Gillette", "unit": "1pc", "raw_names": "gillette mach3|mach 3 razor|gillette razor", "aliases": "gillette mach3|shaving razor"},
    {"canonical_name": "Whisper Ultra Clean Pads", "brand": "Whisper", "unit": "15pc", "raw_names": "whisper ultra|whisper pads|ultra clean pads", "aliases": "whisper|sanitary pads ultra"},
    {"canonical_name": "Surf Excel Easy Wash Powder", "brand": "Surf Excel", "unit": "500g", "raw_names": "surf excel easy wash|surf excel powder|easy wash surf", "aliases": "surf excel easy|detergent powder surf"},
    {"canonical_name": "Fevicol SH Adhesive", "brand": "Fevicol", "unit": "100g", "raw_names": "fevicol sh|fevicol adhesive|fevicol glue", "aliases": "fevicol|white adhesive"},
]

def main():
    # Check how many exist
    existing = supabase.table("product_catalog").select("id", count="exact").execute()
    print(f"Current rows: {existing.count}")

    if existing.count and existing.count >= 50:
        print("Already seeded! Skipping.")
        return

    # Clear and re-seed
    if existing.count and existing.count > 0:
        print("Clearing existing partial data...")
        supabase.table("product_catalog").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    # Insert in batches of 10
    for i in range(0, len(SEED_DATA), 10):
        batch = SEED_DATA[i:i+10]
        result = supabase.table("product_catalog").insert(batch).execute()
        print(f"  Inserted batch {i//10 + 1}: {len(result.data)} rows")

    # Verify
    final = supabase.table("product_catalog").select("id", count="exact").execute()
    print(f"\nTotal rows after seeding: {final.count}")
    print("[DONE] Catalog seeded successfully!")

if __name__ == "__main__":
    main()
