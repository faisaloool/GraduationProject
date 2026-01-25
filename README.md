# Quiz AI Interface (Frontend)

React + Vite frontend for a quiz/exam platform that generates quizzes from uploaded files and lets users manage, share, and take exams.

> **Status**: Frontend is functional. The **Backend** section below contains questions so we can document your server accurately.

## Features

- **Authentication**: sign up, log in, persistent sessions via secure cookie, logout cleanup
- **Account verification**: verify new users via code/token
- **Password recovery**: request reset email, verify reset token, reset password
- **AI Quiz generation**: upload a file and generate a quiz with configurable settings (MCQ/True-False counts)
- **Exam management**: list exams, load exam details, rename, delete
- **Regeneration tools**: regenerate a whole quiz or a single question
- **Sharing**: generate share token and import shared exams
- **Exam submission**: submit answers and receive results
- **Health check gating**: app shows an error page if backend health fails

## Tech Stack

- **React 19**
- **React Router 7**
- **Vite 7**
- **ESLint 9**
- **js-cookie** for secure token cookie storage

## Project Structure

- `src/main.jsx`: React entry point; wraps the app with providers
- `src/context/AuthContext.jsx`: authentication state + helpers
- `src/context/ExamsProvider.jsx`: exams state + actions (load, share, regenerate, submit)
- `src/util/service.js`: centralized API client (fetch wrapper, error handling, endpoints)
- `src/components/*`: UI components (auth form, quiz page, sidebar, etc.)
- `src/style/*`: component styling

## Routes

Defined in `src/App.jsx`:

- `/` and `/exam/:id`: main layout (sidebar + quiz page)
- `/shared/:token`: shared exam route (import/verify share token)
- `/Log-in`, `/Sign-up`: authentication
- `/verifyaccount`: verify newly created account
- `/change-password/:token` (and `/change-password`): password reset flow

## API Endpoints (Frontend Usage)

These are the backend routes the frontend **actually calls** (see `src/util/service.js`). Routes are shown exactly (including casing and query parameter names).

**Health**

- `GET /api/v1/quiz-ai/health`

**Auth**

- `POST /api/v1/quiz-ai/Login`
- `POST /api/v1/quiz-ai/Signup`

**Account verification**

- `POST /api/v1/quiz-ai/VerifyNewUser?UserID=...&token=...`

**Password reset**

- `POST /api/v1/quiz-ai/Forgot-Password`
- `GET /api/v1/quiz-ai/VerifyForgetPasswordToken?token=...`
- `POST /api/v1/quiz-ai/ResetPassword?id=...&password=...`

**Exams / quizzes** (JWT required)

- `GET /api/v1/quiz-ai/exams`
- `GET /api/v1/quiz-ai/Quiz/{quizID}`
- `PUT /api/v1/quiz-ai/{quizID}/rename`
- `DELETE /api/v1/quiz-ai/quiz/delete?QuizID=...`

**AI quiz generation** (JWT required; multipart/form-data)

- `POST /api/v1/quiz-ai/Quiz/Generate`
  - Form fields used by the frontend: `file`, optional `mcqCount`, optional `tfCount`

**Regeneration** (JWT required)

- `POST /api/v1/quiz-ai/Quiz/Regenerate?QuizID=...`
- `POST /api/v1/quiz-ai/regenerate-question?QuizID=...&QuestionID=...&QuestionType=...`
- `DELETE /api/v1/quiz-ai/Questions/delete?QuizID=...&QuestionID=...`

**Sharing** (JWT required)

- `POST /api/v1/quiz-ai/Share?QuizID=...`
- `POST /api/v1/quiz-ai/ShareVerify?Token=...`

**Submission** (JWT required)

- `POST /api/v1/quiz-ai/submit`

## Auth Model (Frontend)

- The **token** is stored in a cookie key: `quizai:token` (via `js-cookie`)
- The **user profile** is stored in `localStorage` (Remember Me) or `sessionStorage`
- On logout, the app clears user + token and removes cached app keys that start with `quizai:`

## Backend

### Tech Stack

- **Framework**: ASP.NET
- **Authentication**: JWT Bearer token
- **Base URL**: not available yet (backend currently accessed via a temporary tunnel/proxy)

### Account Verification

- Verification is done via a **code sent to the user email**.
- The backend expects **(userId + verification code)**.

### Password Reset

- Reset token is delivered via an **email link**.
- Endpoint/request/response shapes are intentionally omitted.

### Quiz Generation

- The backend uses an **AI model** to generate quizzes/exams from the uploaded content.
- Supported upload types: **PDF, DOC, DOCX, PowerPoint**
- Max upload size: **20 MB**
- Validation rule: `mcqCount + tfCount` must be **> 1** and **< 21**.

### Data Model

- Quiz/Exam identifier type: **UUID**
- Questions/options have **stable IDs**.

### Sharing

- Share token is a **unique token per shared quiz** and **expires after 5 minutes**.
- `ShareVerify` returns a **success message** confirming the quiz was shared and saved to the user's quiz history (it does not return the full quiz payload).

### Submission

- `/submit` **stores submission info in the database** (it does not return score/correct answers/explanations).
- Partial credit: **not supported**.
