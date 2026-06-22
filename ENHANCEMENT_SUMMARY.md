# Resume Parsing Pipeline Enhancement

## Changes Made

### 1. **Gemini-Enhanced Resume Parsing with Fallback** 
   - **File**: [backend/app/services/resume_service.py](backend/app/services/resume_service.py)
   - **New Function**: `parse_resume_sections_with_gemini(text, gemini_api_key)`
   - **Features**:
     - Uses Gemini 2.5-flash-lite with temperature=0.1 for deterministic extraction
     - Strict JSON schema enforced via prompt
     - Extracts: skills, years_of_experience, education, projects, certifications, summary
     - **Automatic fallback** to existing regex parser if:
       - Gemini API key not configured
       - API call fails or times out
       - Response is invalid JSON
       - Insufficient/malformed data extracted

### 2. **Updated Resume Upload Pipeline**
   - **File**: [backend/app/api/resume_routes.py](backend/app/api/resume_routes.py)
   - **Change**: Resume upload endpoint now calls `parse_resume_sections_with_gemini()` instead of `parse_resume_sections()`
   - **Backward Compatible**: Falls back to regex parser silently if Gemini unavailable

### 3. **ATS Scoring Weight Adjustment**
   - **File**: [backend/app/services/ats_service.py](backend/app/services/ats_service.py)
   - **Updated Weights**:
     - Skills score: **60%** (was 50%)
     - Keyword score: **20%** (was 30%)
     - Experience score: **20%** (unchanged)
   - **Formula**: `ranking_score = (skills_score * 0.6) + (keyword_score * 0.2) + (experience_score * 0.2)`

## Behavior

### Extraction Flow
```
Resume Upload
    ↓
Extract Text (PDF/DOCX)
    ↓
Parse with Gemini + Fallback
    ├→ Try Gemini extraction (async, low temp=0.1)
    └→ If fails → Use regex parser
    ↓
Store parsed_sections in DB
    ↓
Return to client
```

### Data Schema (Gemini or Regex)
```json
{
  "summary": "string",
  "skills": ["string"],
  "years_of_experience": 0,
  "education": ["string"],
  "projects": ["string"],
  "certifications": ["string"],
  "experience": [],
  "raw": "string"
}
```

## Implementation Details

- **No breaking changes**: Existing regex parser remains unchanged, used as fallback
- **Minimal code**: ~80 lines added for Gemini extraction + 1 line change in resume routes + 1 line in ATS scoring
- **Low temperature**: Temperature set to 0.1 for deterministic output
- **Strict schema**: Prompt enforces valid JSON only, no markdown
- **Error handling**: All exceptions caught, falls back gracefully
- **Async-safe**: Uses `asyncio.to_thread()` for non-blocking Gemini calls

## Testing

To verify the enhancement:

1. **With Gemini API Key configured**:
   - Upload a resume → Check that `parsed_sections` contains Gemini-extracted data
   - Check logs for Gemini call

2. **Without Gemini API Key**:
   - Upload a resume → Falls back to regex parser automatically
   - Same behavior as before enhancement

3. **ATS Scoring**:
   - Skills now weighted at 60% (should increase skill-match scores)
   - Test with a resume that has strong skill matches

## Files Modified

1. `backend/app/services/resume_service.py` - Added async Gemini extraction function
2. `backend/app/api/resume_routes.py` - Updated to call Gemini-enhanced parser
3. `backend/app/services/ats_service.py` - Updated scoring weights (60/20/20)
