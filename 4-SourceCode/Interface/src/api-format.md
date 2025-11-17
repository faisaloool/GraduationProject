# API Specification

## Last Updated: 2025/11/16

## HTTP Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 200  | OK           |
| 201  | Created      |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 404  | Not Found    |
| 500  | Server Error |

---

# Endpoints general format

## ============================================

## Endpoint Name

**URL:**  
**Method:**  
**Description:**

### Request Body

{
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {

}
}

### Response Body (Error)

{
"success": false,
"status": 400,
"message": "Missing required field: email",
"timestamp": "2025-11-16T18:23:00Z",
"error": {
"code": "INVALID_INPUT",
"details": "Email field cannot be empty."
},
"data": null
}

## ============================================

## Quiz AI Endpoints

## 1. server helth status

**URL:quiz-ai/helth**  
**Method:GET**  
**Description:getting the server helth status**

## 2. Log in

**URL:quiz-ai/login**  
**Method:POST**  
**Description:Logining in users if they have an accouont**

## 3. Sign up

**URL:quiz-ai/signup**  
**Method:POST**  
**Description:Creating accounts for users**

## 4. Quiz Generate

**URL:quiz-ai/quiz/create**  
**Method:POST**  
**Description:generating a Quiz based on the user data**

## 5. Get exam based on User id

**URL:quiz-ai/user/:id/exams**  
**Method:GET**  
**Description: Getting user exames**

## 6. Quiz delete

**URL:quiz-ai/quiz/delete**  
**Method:DEL**  
**Description:Delete exames based on user request body**

## 7. Rename Quiz

**URL:quiz-ai/quiz/rename**  
**Method:PUT**  
**Description: Renaming quizes based on user request body**

## 8. Quiz serach

**URL:quiz-ai/quiz/serach**  
**Method:GET**  
**Description: Getting exames based on the filters that the user will provide in the request body**

## 9. Question regenrate

**URL:quiz-ai/quiz/:id/question/:questionNumber/regenrate**  
**Method:POST**  
**Description:Regenrate question based on the exam id and question number provided in the parameters**

## 10. Question delete

**URL:quiz-ai/quiz/:id/question/:questionNumber/delete**  
**Method:DEL**  
**Description:Deleting question based on the exam id and question number provided in the parameters**

## 11. Share quiz (don't know how yet!)

**URL:**  
**Method:**  
**Description:**
