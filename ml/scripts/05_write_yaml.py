import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATASET_DIR, UNIFIED_CLASSES

names_block = "\n".join(f"  {i}: {name}" for i, name in enumerate(UNIFIED_CLASSES))

content = f"""path: {DATASET_DIR}
train: images/train
val: images/valid
test: images/test

nc: {len(UNIFIED_CLASSES)}
names:
{names_block}
"""

out_path = os.path.join(DATASET_DIR, "data.yaml")
with open(out_path, "w") as f:
    f.write(content)

print(f"Wrote {out_path}")
print(content)
