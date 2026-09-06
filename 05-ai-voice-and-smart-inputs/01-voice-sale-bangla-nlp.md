# Smart Feature: Bangla Voice Sale Input

## 1. How It Works

```mermaid
graph LR
    A["Voice: 'দুইটা সাবান, এক কেজি চিনি'"] --> B[Bangla Speech-to-Text]
    B --> C[NLP Entity & Number Parser]
    C --> D["Cart: [Lux Soap x 2, Sugar 1kg x 1]"]
    D --> E[1-Tap Confirm on Screen]
```

* **Local Token Lexicon:** Trained on common local product terminology (সাবান, চিনি, ডাল, তেল, নাপা, ডিম).
* **Confidence Guardrail:** Always shows a visual preview on screen for 1-tap confirmation before committing transaction.
