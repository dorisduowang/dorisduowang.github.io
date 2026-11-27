"""Reproduce saved-message scores without generating any new agent response."""
import csv
import json
import os
from pathlib import Path
import re

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parent
MODEL = "distilbert/distilgpt2"
REVISION = "2290a62682d06624634c1f46a6ad5be0f47f38aa"
WORDS = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()
NUMBER = re.compile(r"\b(?:\d+(?:\.\d+)?|" + "|".join(WORDS) + r")\b", re.I)
torch.set_num_threads(1)
torch.use_deterministic_algorithms(True)
tokenizer = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
model = AutoModelForCausalLM.from_pretrained(MODEL, revision=REVISION).eval().to("cpu")


def score(previous, current):
    # The target is tokenized separately from the original public-message prefix.
    history = "Previous round public messages\n" + "\n".join(f"P{i+1}\n{s}" for i, s in enumerate(previous))
    result = []
    for i, message in enumerate(current):
        prefix = tokenizer.encode(history + f"\nCurrent message P{i+1}\n", add_special_tokens=False)
        target = tokenizer.encode(message, add_special_tokens=False)
        assert prefix and target and len(prefix) + len(target) <= 1024
        ids = torch.tensor([prefix + target])
        with torch.inference_mode():
            logits = model(input_ids=ids, use_cache=False).logits[0, :-1].float()
            losses = torch.nn.functional.cross_entropy(logits, ids[0, 1:], reduction="none").tolist()
        values = losses[len(prefix) - 1:]
        result.append(sum(values) / len(values))
    return result


rounds = json.loads((ROOT / "rounds.json").read_text())
expected = json.loads((ROOT / "expected_data.json").read_text())["rounds"]
output = []
for t in range(2, 16):
    previous = list(rounds[t - 2]["messages"].values())
    current = list(rounds[t - 1]["messages"].values())
    raw = score(previous, current)
    masked = score([NUMBER.sub("NUMBER", s) for s in previous], [NUMBER.sub("NUMBER", s) for s in current])
    for i in range(4):
        reference = expected[t - 1]["messages"][i]
        assert abs(raw[i] - reference["score"]) < 1e-6
        assert abs(masked[i] - reference["quantity_masked_score"]) < 1e-6
        output.append({"round": t, "player": f"P{i+1}", "score": raw[i], "quantity_masked_score": masked[i]})
with (ROOT / "reproduced_scores.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(output[0]))
    writer.writeheader()
    writer.writerows(output)
print("Reproduced 56 original scores and 56 masking diagnostics within 0.000001 nats per target token")
