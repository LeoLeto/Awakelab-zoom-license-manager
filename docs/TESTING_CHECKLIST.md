# 🧪 Password Management Testing Checklist

Use this checklist to systematically test the Zoom password management feature.

## Pre-Testing Setup

- [ ] Zoom Server-to-Server OAuth app created and activated
- [ ] Credentials added to `backend/.env`
- [ ] Backend dependencies installed (`npm install`)
- [ ] Backend server running (`npm run dev`)
- [ ] Server responding at `http://localhost:3001/api/health`

## Test 1: API Connection ✅

**Endpoint:** `GET /api/zoom/test`

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/test"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Zoom API connected successfully"
}
```

**Result:** ⬜ Pass / ⬜ Fail

**Notes:**
_______________________________________________

---

## Test 2: Retrieve Zoom Users 📋

**Endpoint:** `GET /api/zoom/users`

**PowerShell:**
```powershell
$users = Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/users"
$users.users | Select-Object -First 5 | Format-Table email, first_name, last_name
```

**Expected:** List of all Zoom users (should be ~170 users)

**Result:** ⬜ Pass / ⬜ Fail

**Number of users found:** _______________

**Notes:**
_______________________________________________

---

## Test 3: Get Specific User 👤

**Endpoint:** `GET /api/zoom/users/:email`

**PowerShell (replace with actual email):**
```powershell
$email = "teacher001@example.com"
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/users/$email"
```

**Expected:** Detailed user information

**Result:** ⬜ Pass / ⬜ Fail

**Notes:**
_______________________________________________

---

## Test 4: Generate Secure Password 🔐

**Endpoint:** `GET /api/zoom/generate-password`

**PowerShell:**
```powershell
# Generate 12-character password
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/generate-password?length=12"

# Generate 16-character password
Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/generate-password?length=16"
```

**Expected:** Random secure passwords meeting Zoom requirements

**Result:** ⬜ Pass / ⬜ Fail

**Sample generated password:** _______________

**Password meets requirements (8+ chars, letters, numbers):** ⬜ Yes / ⬜ No

---

## Test 5: Change Single User Password (Auto-generate) 🔥

**Endpoint:** `POST /api/zoom/change-password`

⚠️ **WARNING:** This will actually change the password!

**PowerShell:**
```powershell
# Choose a test account email
$testEmail = "teacher001@example.com"

$body = @{
    userEmail = $testEmail
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

# Save the new password!
Write-Host "New password: $($result.newPassword)" -ForegroundColor Green
```

**Expected:** Success response with new password

**Result:** ⬜ Pass / ⬜ Fail

**Test email used:** _______________

**New password received:** _______________

**Password saved securely:** ⬜ Yes / ⬜ No

---

## Test 6: Change Single User Password (Custom) 🔧

**Endpoint:** `POST /api/zoom/change-password`

**PowerShell:**
```powershell
$testEmail = "teacher002@example.com"
$customPassword = "TestPass123!"

$body = @{
    userEmail = $testEmail
    newPassword = $customPassword
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

**Expected:** Success response confirming custom password

**Result:** ⬜ Pass / ⬜ Fail

**Test email used:** _______________

**Custom password used:** _______________

---

## Test 7: Verify Password Change Works 🔍

**Manual verification steps:**

1. Go to [Zoom Sign In](https://zoom.us/signin)
2. Try logging in with the test account
3. Use the OLD password → Should FAIL ❌
4. Use the NEW password → Should SUCCEED ✅

**Old password login:** ⬜ Failed (correct) / ⬜ Succeeded (error!)

**New password login:** ⬜ Succeeded (correct) / ⬜ Failed (error!)

**Overall verification:** ⬜ Pass / ⬜ Fail

---

## Test 8: Bulk Password Change 🔄

**Endpoint:** `POST /api/zoom/bulk-change-password`

**PowerShell:**
```powershell
$emailList = @(
    "teacher001@example.com",
    "teacher002@example.com",
    "teacher003@example.com"
)

$body = @{
    userEmails = $emailList
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/bulk-change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

# Display results
$result | ConvertTo-Json -Depth 5
```

**Expected:** Bulk operation summary

**Result:** ⬜ Pass / ⬜ Fail

**Number of users in test:** _______________

**Successful changes:** _______________

**Failed changes:** _______________

---

## Test 9: Error Handling 🚨

### Test 9a: Invalid Email

**PowerShell:**
```powershell
$body = @{
    userEmail = "nonexistent@example.com"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body
} catch {
    Write-Host "Error (expected): $($_.Exception.Message)" -ForegroundColor Yellow
}
```

**Expected:** Error message about user not found

**Result:** ⬜ Pass (error occurred) / ⬜ Fail (no error)

### Test 9b: Weak Password

**PowerShell:**
```powershell
$body = @{
    userEmail = "teacher001@example.com"
    newPassword = "weak"  # Too short, no numbers
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/change-password" `
      -Method Post `
      -ContentType "application/json" `
      -Body $body
} catch {
    Write-Host "Error (expected): $($_.Exception.Message)" -ForegroundColor Yellow
}
```

**Expected:** Error about password requirements

**Result:** ⬜ Pass (error occurred) / ⬜ Fail (no error)

---

## Test 10: Performance & Rate Limiting ⚡

**Test bulk operation with timing:**

**PowerShell:**
```powershell
$startTime = Get-Date

# Get first 10 users
$users = Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/users"
$testEmails = $users.users | Select-Object -First 10 -ExpandProperty email

$body = @{
    userEmails = $testEmails
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/zoom/bulk-change-password" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host "Bulk operation completed in $duration seconds"
Write-Host "Average: $($duration / 10) seconds per user"
```

**Number of users tested:** _______________

**Total time:** _______________ seconds

**Average per user:** _______________ seconds

**Result:** ⬜ Pass / ⬜ Fail

---

## Summary

**Total Tests:** 10
**Passed:** _______
**Failed:** _______
**Success Rate:** _______%

## Critical Features Verified

- [ ] Zoom API connection established
- [ ] Can retrieve user list
- [ ] Can generate secure passwords
- [ ] Can change single user password (auto)
- [ ] Can change single user password (custom)
- [ ] Password change is verified (actual Zoom login test)
- [ ] Bulk password change works
- [ ] Error handling works correctly
- [ ] Performance is acceptable

## Notes & Issues

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

## Next Steps

Once all tests pass:
1. ✅ Save this checklist for future reference
2. 📊 Proceed with database schema design
3. 🎨 Start building the React dashboard
4. 🤖 Implement automated password rotation

---

**Testing Date:** _______________

**Tester Name:** _______________

**Environment:** Development / Staging / Production

**All Critical Features Working:** ⬜ Yes / ⬜ No
