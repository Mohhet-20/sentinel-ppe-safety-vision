"""Shared config for the PPE dataset merge pipeline."""
import os

E_ROOT = r"E:\PPE_DATASETS"
RAW_DIR = os.path.join(E_ROOT, "raw")

DS1_ZIP = os.path.join(E_ROOT, "archive (1).zip")
DS2_ZIP = os.path.join(E_ROOT, "archive (2).zip")
DS3_ZIP = os.path.join(E_ROOT, "archive (3).zip")

ML_ROOT = r"F:\safety-platform\ml"
STAGING_DIR = os.path.join(ML_ROOT, "staging")
STAGING_IMAGES = os.path.join(STAGING_DIR, "images")
STAGING_LABELS = os.path.join(STAGING_DIR, "labels")

DATASET_DIR = os.path.join(ML_ROOT, "dataset")

# --- Unified taxonomy -------------------------------------------------
# Ordering/names chosen to match keyword-based matching already present in
# backend/app/services/ppe_incident_rules.py and rule_engine.py:
#   hardhat/helmet, vest, mask, goggle, glove, boot, person, no-/no_ prefixes.
UNIFIED_CLASSES = [
    "Person",           # 0
    "Hardhat",          # 1
    "NO-Hardhat",       # 2
    "Safety Vest",      # 3
    "NO-Safety Vest",   # 4
    "Mask",             # 5
    "NO-Mask",          # 6
    "Gloves",           # 7
    "Boots",            # 8
    "Goggles",          # 9
    "Safety Cone",      # 10
    "Machinery",        # 11
    "Vehicle",          # 12
]
NAME_TO_ID = {name: i for i, name in enumerate(UNIFIED_CLASSES)}

# --- Dataset 1 (Pictor-style PPE dataset, VOC-derived, 17 raw classes) ---
# raw id -> raw name (recovered by cross-referencing labels/*.txt with voc_labels/*.xml)
DS1_RAW_NAMES = {
    0: "person", 1: "ear", 2: "ear-mufs", 3: "face", 4: "face-guard",
    5: "face-mask-medical", 6: "foot", 7: "tools", 8: "glasses", 9: "gloves",
    10: "helmet", 11: "hands", 12: "head", 13: "medical-suit", 14: "shoes",
    15: "safety-suit", 16: "safety-vest",
}
DS1_MAP = {
    0: NAME_TO_ID["Person"],
    5: NAME_TO_ID["Mask"],           # face-mask-medical -> Mask
    8: NAME_TO_ID["Goggles"],        # glasses -> Goggles
    9: NAME_TO_ID["Gloves"],
    10: NAME_TO_ID["Hardhat"],       # helmet -> Hardhat
    14: NAME_TO_ID["Boots"],         # shoes -> Boots
    16: NAME_TO_ID["Safety Vest"],   # safety-vest -> Safety Vest
    # dropped (no reliable/consistent mapping to unified PPE taxonomy):
    # ear, ear-mufs, face, face-guard, foot, tools, hands, head,
    # medical-suit, safety-suit
}

# --- Dataset 2 (roboflow ppe-6-classes, YOLO *segmentation* polygons) ---
DS2_RAW_NAMES = ['boots', 'gloves', 'goggles', 'helmet', 'person', 'vest']
DS2_MAP = {
    0: NAME_TO_ID["Boots"],
    1: NAME_TO_ID["Gloves"],
    2: NAME_TO_ID["Goggles"],
    3: NAME_TO_ID["Hardhat"],
    4: NAME_TO_ID["Person"],
    5: NAME_TO_ID["Safety Vest"],
}

# --- Dataset 3 (Construction Site Safety css-data, YOLO bbox) ---
DS3_RAW_NAMES = [
    "Hardhat", "Mask", "NO-Hardhat", "NO-Mask", "NO-Safety Vest", "Person",
    "Safety Cone", "Safety Vest", "machinery", "vehicle",
]
DS3_MAP = {
    0: NAME_TO_ID["Hardhat"],
    1: NAME_TO_ID["Mask"],
    2: NAME_TO_ID["NO-Hardhat"],
    3: NAME_TO_ID["NO-Mask"],
    4: NAME_TO_ID["NO-Safety Vest"],
    5: NAME_TO_ID["Person"],
    6: NAME_TO_ID["Safety Cone"],
    7: NAME_TO_ID["Safety Vest"],
    8: NAME_TO_ID["Machinery"],
    9: NAME_TO_ID["Vehicle"],
}
