import sys
from pathlib import Path

# Os scripts do pipeline importam `config` e `common` como modulos soltos (pasta pipeline/).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
