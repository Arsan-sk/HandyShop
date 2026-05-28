# Upload Pipeline Fix - Comprehensive Audit

## Issues Identified

### 1. **CRITICAL: Wrong Bucket Name**
- **Current Code:** `.from("posts")`
- **Actual Bucket:** `"posts-media"` (defined in schema.sql)
- **Impact:** Upload fails silently, files never reach storage

### 2. **Error Handling Gap**
- When upload fails, `continue` skips mediaRecord creation
- mediaRecords stays empty
- Post should be deleted but user reports posts still exist
- Need to verify deletion logic works correctly

### 3. **No Upload Validation**
- No check that file actually uploaded before creating mediaRecord
- No verification of public URL accessibility
- mediaRecords created with potentially invalid media_url

### 4. **Slow Upload Issues**
- Possible timeout waiting for non-existent bucket
- No upload progress tracking
- No partial upload retry mechanism
- No chunked upload for large files

### 5. **Path Construction Issues**
- bucketPath uses `posts/${fileName}` - redundant 'posts/'
- Should be just the relative path: `${post.id}/${timestamp}_${i}.${ext}`
- RLS policies expect files in format: `{user_id}/filename`

### 6. **Client-Side Improvements Needed**
- No handling for storage errors
- No indication of upload progress
- 50MB limit should be enforced per total, not per file
- No retry mechanism

## Solutions

### Fix 1: Bucket Name
```typescript
// Change from:
.from("posts")
// To:
.from("posts-media")
```

### Fix 2: Path Format
Should follow RLS policy convention: `{user_id}/files...`
```typescript
const fileName = `${user.id}/${post.id}/${Date.now()}_${i}.${extension}`;
```

### Fix 3: Upload Validation
Add checks before creating mediaRecord:
- Verify uploadError is null
- Verify uploadData exists
- Test URL is accessible

### Fix 4: Better Error Handling
- Log all errors with context
- Return clear error messages to client
- Proper cleanup on failure
- Distinguish between upload failure and DB failure

### Fix 5: Client-Side Progress
- Track upload progress per file
- Show which file is uploading
- Handle timeout scenarios
- Provide retry option

## Files to Update
1. `/src/app/api/posts/create/route.ts` - Fix bucket, paths, validation, error handling
2. `/src/app/(app)/home/create/page.tsx` - Improve progress tracking and error messages

## Testing Checklist
- [ ] Upload small image (1MB)
- [ ] Upload medium image (10MB)
- [ ] Upload near limit (45MB)
- [ ] Verify file appears in Supabase Storage bucket
- [ ] Verify public URL is accessible
- [ ] Check console for [API] logs
- [ ] Verify post appears in feed with image loaded
- [ ] Test upload timeout (disable internet temporarily)
- [ ] Test upload cancellation
- [ ] Verify storage bucket has correct file structure
