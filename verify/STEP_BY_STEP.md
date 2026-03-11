# STEP-BY-STEP BEGINNER GUIDE (No jargon, just do this)

> **I'm going to show you EXACTLY what to do, line by line.**

---

## STEP 1 — Write the spec file (this is a template you fill in)

### What is this step?
You're writing down "what does success look like?" **before** you build anything.

### Commands to run

```bash
# Open a terminal
cd /Users/sunil/Downloads/Eden.so

# Copy the template
cp verify/spec/auth.md verify/spec/dark-mode.md

# Open the file in VS Code (or any text editor)
# Click on verify/spec/dark-mode.md in the left sidebar
```

### What you'll see

The file looks like this:

```markdown
# Task
Google OAuth login for Eden.so

## Changed Files
- src/features/auth/components/LoginPage.tsx
- src/features/auth/services/authService.ts
- src/features/auth/stores/authStore.ts

## Acceptance Criteria

### AC-1: Login page renders
- Visiting `/` when unauthenticated shows the login card
- The page contains a "Sign in with Google" button (role=button)
- The Eden.so logo SVG is visible
- No console errors on initial render

### AC-2: Sign-in button state
- The "Sign in with Google" button is enabled by default (not disabled)
- While sign-in is in flight (`isLoading=true`) the button gains `aria-busy="true"` and is disabled
- A spinner element is visible during loading (aria-hidden="true")
```

### What you need to do — EDIT this file

Replace with your own feature. Example: **"Add dark mode toggle"**

```markdown
# Task
Add a dark mode toggle button to the header

## Changed Files
- src/features/workspace/components/Header.tsx
- src/styles/theme.css
- src/app/stores/themeStore.ts

## Acceptance Criteria

### AC-1: Dark mode button appears
- The header shows a button that says "🌙 Dark Mode"
- The button is clickable (not disabled)

### AC-2: Clicking button enables dark mode
- Clicking the button changes the background to dark (not white)
- Text color changes to light (not dark)
- The button now says "☀️ Light Mode"

### AC-3: Dark mode persists
- If I enable dark mode and refresh the page, it's still dark
- If I enable light mode and refresh, it's still light

### AC-4: Works on all pages
- Dark mode works on the login page, canvas page, and settings page
- No broken text or unreadable colors anywhere
```

**That's it.** Stop here and SAVE the file.

---

## STEP 2 — Build the feature (this is where Claude helps you)

### What is this step?
You're telling Claude Code to build the feature. Claude reads your spec and implements it.

### Commands to run

```bash
# Make sure you're in the right folder
cd /Users/sunil/Downloads/Eden.so

# Start Claude Code in interactive mode
claude
```

### What you'll see

Claude will start an interactive session. It'll ask you for permission to edit files.

### What you need to do — tell Claude what to build

Copy and paste this message into Claude Code:

```
I need to build a feature. Here's the spec:

## Task
Add a dark mode toggle button to the header

## What needs to happen
1. Header shows a button that says "🌙 Dark Mode"
2. Clicking it changes the background to dark and text to light
3. The button text changes to "☀️ Light Mode"
4. Dark mode preference persists when you refresh
5. It works on all pages: login, canvas, settings

The full spec is in verify/spec/dark-mode.md — follow it exactly.
```

### What Claude will do

- Ask for permission to edit files
- Write code to add the toggle button
- Save changes to your files
- Show you the changes

### How do you know when it's done?

When Claude Code is finished:
1. It'll say something like "Done!" or "Ready for testing"
2. The code changes will appear in the VS Code editor
3. You'll see your files changed in the left sidebar

### Exit Claude Code when done

Press:
```
Ctrl+C
```

or type:
```
exit
```

---

## STEP 3 — Verify it actually works (this is the magic part)

### What is this step?
You're running an automated test that checks if your feature matches the spec.

### The ONE command you run

```bash
cd /Users/sunil/Downloads/Eden.so

./verify/run.sh verify/spec/dark-mode.md
```

### What happens next (takes ~30-60 seconds)

The system:
1. ✅ Checks your dev server is running
2. 🧠 Reads your spec and figures out what to test (Opus AI)
3. 🌐 Opens a browser and tests each requirement (Sonnet AI × 4 times)
4. ⚖️ Judges if everything passed (Opus AI)

### What you'll see on screen

**If EVERYTHING WORKS:**

```
═══════════════════════════════════════════════
  VERDICT
═══════════════════════════════════════════════

✅  AC-1  PASSED
   Dark mode button appears in the header with correct text.

✅  AC-2  PASSED
   Clicking the button switches to dark mode correctly.

✅  AC-3  PASSED
   Dark mode setting persists after page refresh.

✅  AC-4  PASSED
   Dark mode works on all pages without visual issues.

✅  All criteria passed. Safe to merge.
```

**Great! You're done! Go to lunch.** 🎉

---

**If SOMETHING FAILED:**

```
═══════════════════════════════════════════════
  VERDICT
═══════════════════════════════════════════════

✅  AC-1  PASSED
   Dark mode button appears in the header.

❌  AC-2  FAILED
   Expected dark background after clicking.
   Actual: Background is still white.
   Evidence: .verify/evidence/AC-2/screenshot-2.png

✅  AC-3  PASSED
   Dark mode persists after refresh.

⚠️  AC-4  NEEDS HUMAN REVIEW
   Dark mode works on login and canvas, but settings page had rendering issues.
```

---

## STEP 4 — Fix failures and re-run (repeat until green ✅)

### What is this step?
Something didn't work. You fix it and test again.

### If you see ❌ FAILED

**Example failure:**
```
❌  AC-2  FAILED
Expected dark background after clicking.
Actual: Background is still white.
```

### What to do:

1. **Look at the screenshot** to see what happened:
   ```bash
   # Look inside this folder
   ls -la .verify/evidence/AC-2/
   
   # Open screenshot-2.png to see what the browser actually saw
   ```

2. **Fix the code** in the editor:
   - The error says "background is still white"
   - So go to `src/styles/theme.css` and fix the dark mode colors
   - Or ask Claude Code to fix it

3. **Re-run verification:**
   ```bash
   ./verify/run.sh verify/spec/dark-mode.md
   ```

4. **Check the new verdict:**
   - Did it pass? ✅ Done!
   - Did it still fail? ❌ Go back to step 2 and fix again

### If you see ⚠️ NEEDS HUMAN REVIEW

This means the AI wasn't sure. Look at the screenshot and:
- If it looks right to you, you're done
- If it looks wrong, fix it and re-run

---

## Real example: Let's do it together

### Example: Adding a "Save" button

**STEP 1 — Write the spec**

Create file: `verify/spec/save-button.md`

```markdown
# Task
Add a Save button to the canvas editor

## Changed Files
- src/features/canvas/components/Editor.tsx
- src/features/canvas/services/editorService.ts

## Acceptance Criteria

### AC-1: Save button appears
- The editor shows a button labeled "Save"
- The button is blue
- The button is clickable (not disabled)

### AC-2: Clicking Save persists data
- After clicking Save, a success message appears
- The message says "Saved successfully"

### AC-3: Save button appears on every page
- The Save button is visible on the canvas page
- The Save button is visible on any other editor pages
```

Save this file.

---

**STEP 2 — Build with Claude**

```bash
claude
```

Paste into Claude:
```
Build the feature in verify/spec/save-button.md

Requirements:
- Add a "Save" button (blue, clickable)
- Show success message when clicked
- Make it appear on all editor pages
```

Wait for Claude to finish.

Press Ctrl+C to exit Claude.

---

**STEP 3 — Verify it works**

```bash
./verify/run.sh verify/spec/save-button.md
```

Wait 30 seconds...

---

**What if AC-1 failed?**

```
❌  AC-1  FAILED
Expected: Blue clickable button labeled "Save"
Actual: No button found on page
```

Fix it:
```bash
# Look at what the browser saw
cat .verify/evidence/AC-1/screenshot-0.png

# The screenshot shows: button is missing!
# So go to src/features/canvas/components/Editor.tsx
# and add the button
```

Then re-run:
```bash
./verify/run.sh verify/spec/save-button.md
```

---

## Troubleshooting

### "I ran step 3 but got an error"

**Error:** `Dev server not reachable`
**Fix:** 
```bash
# In a DIFFERENT terminal, make sure this is running:
npm run dev

# Then try again
./verify/run.sh verify/spec/save-button.md
```

**Error:** `claude CLI not found`
**Fix:**
```bash
# It should be installed already, but try:
which claude

# If it says "not found", install it:
npm install -g @anthropic-ai/claude-code
```

### "I don't understand the failure"

**Look at the screenshot!**

```bash
# Go here
ls .verify/evidence/AC-1/

# Open screenshot-0.png, screenshot-1.png, etc in an image viewer
# They show exactly what the browser saw

# That's your answer
```

### "Do I have to write the spec first?"

**YES.** This is the whole point.

Spec first = you know what you're building
Build without spec = you build random stuff
Verify without spec = meaningless

---

## Checklist before you start

- [ ] Terminal 1 is running `npm run dev` (leave it running)
- [ ] Terminal 2 is where you run `./verify/run.sh`
- [ ] You have a `verify/spec/my-feature.md` file (copied from auth.md)
- [ ] You've edited that file with your own spec
- [ ] You've built the feature with `claude`
- [ ] You're ready to run `./verify/run.sh verify/spec/my-feature.md`

---

## Summary

| Step | What | How long | Command |
|------|------|----------|---------|
| 1 | Write spec | 30 min | `cp verify/spec/auth.md verify/spec/my-feature.md` + edit |
| 2 | Build | 2-4 hr | `claude` |
| 3 | Verify | 1 min | `./verify/run.sh verify/spec/my-feature.md` |
| 4 | Fix if needed | varies | Edit + re-run step 3 |

---

## Try it RIGHT NOW with the demo

```bash
# Terminal 1 (leave running):
npm run dev

# Terminal 2:
./verify/run.sh verify/spec/auth.md

# You'll see it pass in ~30 seconds
```

That's the whole system. You just watched it work! 🎉
