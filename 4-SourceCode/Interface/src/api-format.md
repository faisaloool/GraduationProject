 API Specification

## Last Update: 2025/12/30
#
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

## 1. server helth status //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/helth**  
**Method:GET**  
**Description:getting the server helth status**

### Request Body

none

## 2. Log in //////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/login**  
**Method:POST**  
**Description:Logining in users if they have an accouont**

### Request Body

{
"email": ,
"password":
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"user": {
"id": 1,
"name": "Qotiph khaled",
"email": "qotiph@gmail.com"
},
"token": "mocked-jwt-token-123"
}
}

### Response Body (Error)

{
"success": false,
"status": ,
"message": "",
"timestamp": "2025-11-16T18:23:00Z",
"error": {
"code": "INVALID_INPUT",
"details": "Email field cannot be empty."
},
"data": null
}

## 3. Sign up ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/signup**  
**Method:POST**  
**Description:Creating accounts for users**

### Request Body

{
"name": ,
"email": ,
"password":
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"user": {
"id": 1,
"name": "Qotiph khaled",
"email": "qotiph@gmail.com"
},
"token": "mocked-jwt-token-123"
}
}

### Response Body (Error)

{
"success": false,
"status": ,
"message": "",
"timestamp": "2025-11-16T18:23:00Z",
"error": {
"code": "INVALID_INPUT",
"details": "Email field cannot be empty."
},
"data": null
}

## 4. PassWord recovery  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/ ? ?**  
**Method:POST**  
**Description:reassigning the password after sending an email to the user email and verifiying the code to set the new password**



## 5. Quiz Generate //////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/create**  
**Method:POST**  
**Description:generating a Quiz based on the user data**

### Request Body

{
"userId" : id,
"settings" : {
"mcq" : 8,
"tf" : 2
},
"data":
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"examId": id,
"title": "General Knowledge Test",
"totalMarks": 10,
"questions": [
{
"id": 1,
"type": "MCQ",
"question": "What is the capital of Jordan?",
"options": ["Amman", "Madin", "Egypt", "Mu'tah"],
"correctAnswer": "a",
"marks": 2
},
], ....
}
}

## 6. Get exams based on User id    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/user/:id/exams**  
**Method:GET**  
**Description: Getting user exames**

### Request Body

none

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"quizzes": [
{
"examId": 1,
"title": "General Knowledge Test"
}
,{
"examId": 2,
"title": "idk",
}, ....
]
}
}

## 7. Quiz delete    /////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/delete**  
**Method:DEL**  
**Description:Delete exames based on (the id of the exam) in the request body**

### Request Body

{
"quizId" : "1",
}

## 8. Rename Quiz //////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/:quizId/rename**  
**Method:PUT**  
**Description: Renaming quizes based on (the id of the exam)**

### Request Body

{
"name":"newName"
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"newName":"name"
}
}

## 9. Quiz submit \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

**URL:quiz-ai/quiz/submit**  
**Method:POST**  
**Description: Getting exames result after submiting exam answers in the request body**

### Request Body

{
"examId": "exam_01",
"answers": [
{ "questionId": 101, "selectedOption": "a" },
{ "questionId": 102, "selectedOption": "c" },
{ "questionId": 103, "selectedOption": "b" }
]
}

### Response Body (Success)

{
"success": true,
"status": 200,
"data": {
"totalMark": 85,
"results": [
{
"questionId": 101,
"isCorrect": true,
"userSelected": "a",
"correctOption": "a",
"explanation": null
},
{
"questionId": 102,
"isCorrect": false,
"userSelected": "c",
"correctOption": "d",
"referenceSection": "Chapter 4: Advanced AI Models"
}
]
}
}

## 10. Question regenrate /////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/question/regenrate**  
**Method:POST**  
**Description:Regenrate question based on the exam id and question number provided in the request body**

### Request Body

{
"quizId" : "1",
"questionId": "4"
}

### Response Body (Success)

{
"success": true,
"status": 200,
"data": {
"question": {
"id": 1,
"type": "MCQ",
"question": "What is the capital of Jordan?",
"options": ["Amman", "Madin", "Egypt", "Mu'tah"],
"correctAnswer": "a",
"marks": 2
}
}
}

## 11. Question delete /////////////////////////////////////////////////////////////////////////////////////////////////////done
**URL:quiz-ai/quiz/question/delete**  
**Method:DEL**  
**Description:Deleting question based on the request body**

### Request Body

{
"quizId" : "1",
"questionId": "4"
}

## 12. Quiz regenrate ////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/regenrate**  
**Method:POST**  
**Description:Regenrate quiz based on the exam id**

### Request Body

{
"quizId" : "1",
}

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"examId": id,
"title": "General Knowledge Test",
"totalMarks": 10,
"questions": [
{
"id": 1,
"type": "MCQ",
"question": "What is the capital of Jordan?",
"options": ["Amman", "Madin", "Egypt", "Mu'tah"],
"correctAnswer": "a",
"marks": 2
},
], ....
}
}

## 13. Share quiz (don't know how yet!) /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:**  
**Method:**  
**Description:**

## 14. Get quiz based on quiz id /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////done

**URL:quiz-ai/quiz/:id**  
**Method:GET**   
**Description: Getting quiz data from the id**

### Request Body

none

### Response Body (Success)

{
"success": true,
"status": 200,
"message": "Request completed successfully.",
"timestamp": "2025-11-16T18:23:00Z",
"data": {
"quiz": {
"examId": 1,
"title": "General Knowledge Test",
"totalMarks": 10,
"questions": [
{
"id": 1,
"type": "MCQ",
"question": "What is the capital of Jordan?",
"options": ["Amman", "Madin", "Egypt", "Mu'tah"],
"correctAnswer": "a",
"marks": 2
},
], ....
}
, ....
}
}
