# Registry Mapping Rules

## Core Principles
1. **Determinism:** The same input event from the same source MUST always resolve to the exact same `registry_reference_id`.
2. **No Heuristics:** The mapping must rely on strict data fields, not fuzzy matching or AI-based similarity.
3. **No Silent Creation:** If an event does not match an existing, valid registry entry, it MUST be rejected. No automatic creation of new registry entries as fallbacks.

## Reference Generation Logic
*To be defined based on the schema of incoming events*

### Required Fields for Resolution
- **Source** (String, e.g., 'rss', 'api', 'manual')
- **Unique Event Title or URL** (String, representing the deterministic identifier)

### Mapping Algorithm
1. **Normalization:** Convert the event title or URL to lowercase. Remove all special characters, whitespaces, and punctuation to prevent superficial mismatches.
2. **Concatenation:** Join the Source and the Normalized Title/URL using a standard delimiter (e.g., `source::normalized_string`).
3. **Hashing:** Compute a SHA-256 hash of the concatenated string. This ensures fixed-length `registry_reference_id` outputs.
4. **Registry Lookup:** Query the central registry for this `registry_reference_id` (simulated via an in-memory mapped registry or dedicated DB collection).
5. **Resolution:** 
   - If the `registry_reference_id` is found, attach it to the `processingLog.details` or another non-destructive field in the event payload before committing to `NewsItem`.
   - If the `registry_reference_id` is NOT found, throw a `MissingRegistryEntryException` and immediately reject the ingestion payload with HTTP 400. Do NOT create an orphan event.
