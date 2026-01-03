const API_URL = "https://d58837bb-c348-4ce4-9768-3b480c517aba.mock.pstmn.io";
const API_URL2 = "https://382050f1-d285-4eac-93a7-adf0c0e0ef1f.mock.pstmn.io";
//old one with limtited urls const API_URL = "https://0befc81c-b05a-4c91-97dc-febeb4033999.mock.pstmn.io";

async function safeReadBody(res) {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return { json: await res.json(), text: null };
    }
  } catch {
    // fall back to text
  }

  let text = null;
  try {
    text = await res.text();
  } catch {
    text = null;
  }

  if (text) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return { json: JSON.parse(trimmed), text };
      } catch {
        // ignore
      }
    }
  }

  return { json: null, text };
}

function unwrapApiData(payload) {
  // Supports both:
  // - { success, status, message, data: {...} }
  // - { user, token, ... }
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

function extractApiErrorMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === "string") return payload;

  const message =
    payload?.message ||
    payload?.error?.details ||
    payload?.error ||
    payload?.details;

  if (typeof message === "string" && message.trim()) return message;
  return fallbackMessage;
}

async function requestJson(url, { method = "GET", headers = {}, json } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(json ? { "Content-Type": "application/json" } : null),
        ...headers,
      },
      body: json ? JSON.stringify(json) : undefined,
    });

    const { json: payload, text } = await safeReadBody(res);
    const defaultError = text?.trim()
      ? text.trim()
      : `Request failed with status ${res.status}`;

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      payload,
      rawText: text,
      error: res.ok ? null : extractApiErrorMessage(payload, defaultError),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      url,
      payload: null,
      rawText: null,
      error: err?.message || "Network error. Please try again.",
    };
  }
}

export async function loginUser(email, password) {
  const result = await requestJson(`${API_URL}/quiz-ai/login`, {
    method: "POST",
    json: { email, password },
  });

  if (!result.ok) return { error: result.error || "Login failed." };
  const data = unwrapApiData(result.payload);
  return data || { error: "Unexpected server response." };
}

export async function registerUser(name, email, password) {
  const result = await requestJson(`${API_URL}/quiz-ai/signup`, {
    method: "POST",
    json: { name, email, password },
  });

  if (!result.ok) return { error: result.error || "Sign up failed." };
  const data = unwrapApiData(result.payload);
  return data || { error: "Unexpected server response." };
}

export async function fetchUserExams(userId, token) {
  const result = await requestJson(`${API_URL}/quiz-ai/users/${userId}/exams`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok) return { error: result.error || "Failed to fetch exams." };
  const data = unwrapApiData(result.payload);
  return data ?? result.payload;
}

export async function requestPasswordResetEmail(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) return { error: "Please enter your email first." };

  // This endpoint should trigger the backend to send an email containing
  // a reset URL with token (e.g. /change-password/:token).
  const result = await requestJson(`${API_URL}/quiz-ai/change-password`, {
    method: "POST",
    json: { email: cleanEmail },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to send password reset email." };
  }

  const data = unwrapApiData(result.payload);
  return (
    data ||
    result.payload || { success: true, message: "Password reset email sent." }
  );
}

export async function resetPassword(token, password, confirmPassword) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) return { error: "Missing reset token." };

  const url = `${API_URL}/quiz-ai/change-password/${encodeURIComponent(
    cleanToken
  )}`;

  const result = await requestJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
    },
    json: {
      password,
      confirmPassword,
      token: cleanToken,
    },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to reset password." };
  }

  // Return either unwrapped data or a generic success shape.
  const data = unwrapApiData(result.payload);
  return data || { success: true, message: "Password updated successfully." };
}

export async function generateQuizFromFile(file, token, settings) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Optional settings: allow the backend to control question counts.
    // API spec uses: settings: { mcq: number, tf: number }
    if (settings && typeof settings === "object") {
      const mcqCount = Number(settings.mcqCount);
      const tfCount = Number(settings.tfCount);
      if (Number.isFinite(mcqCount) || Number.isFinite(tfCount)) {
        formData.append(
          "settings",
          JSON.stringify({
            mcq: Number.isFinite(mcqCount) ? mcqCount : undefined,
            tf: Number.isFinite(tfCount) ? tfCount : undefined,
          })
        );
      }
    }

    const res = await fetch(`${API_URL2}/quiz-ai/quiz/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Parse body robustly: some backends return JSON with wrong/missing content-type.
    let rawText = null;
    let body = null;
    try {
      rawText = await res.text();
      const trimmed = (rawText || "").trim();
      if (trimmed) {
        // Attempt JSON parse even if headers are wrong.
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          body = JSON.parse(trimmed);
        }
      }
    } catch {
      // keep body/rawText as null
    }

    const headers = Object.fromEntries(res.headers.entries());

    const result = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      headers,
      body,
      rawText,
    };

    if (!res.ok) {
      return {
        ...result,
        error:
          body?.error ||
          body?.message ||
          rawText ||
          `Request failed with status ${res.status}`,
      };
    }

    // Success: return full response object (caller reads result.body)
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      url: "",
      headers: {},
      body: null,
      rawText: null,
      error: error?.message || "Network error while generating quiz.",
    };
  }
}

export async function verifyCode(code, email) {
  const result = await requestJson(`${API_URL}/verify`, {
    method: "POST",
    json: { code, email },
  });

  if (!result.ok) return { error: result.error || "Verification failed." };
  return result.payload;
}

export async function renameQuiz(quizId, title, token) {
  const id = String(quizId ?? "").trim();
  const nextTitle = String(title ?? "").trim();

  if (!id) return { error: "Missing quiz id." };
  if (!nextTitle) return { error: "Title cannot be empty." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/quiz/${encodeURIComponent(id)}/rename`,
    {
      // API doc uses PUT; some backends also accept POST.
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Send both keys for compatibility across backend implementations.
      json: { name: nextTitle, title: nextTitle },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to rename quiz." };
  }

  // Expected response:
  // {
  //   success: true,
  //   message: "Quiz renamed successfully.",
  //   quiz: { id: 1, title: "Updated Quiz Title" }
  // }
  // IMPORTANT: do NOT use the title from the response; use user-provided nextTitle.
  const payload = result.payload;
  const success = payload?.success;
  if (success === false) {
    return {
      error:
        payload?.message || result.error || "Failed to rename quiz (server).",
    };
  }

  const responseQuizId = payload?.quiz?.id ?? payload?.quiz?.quizId;
  const normalizedId = responseQuizId ?? id;

  return {
    success: true,
    message: payload?.message || "Quiz renamed successfully.",
    quiz: {
      id: normalizedId,
      title: nextTitle,
    },
  };
}

export async function deleteQuiz(quizId, token) {
  const id = String(quizId ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/quiz/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to delete quiz." };
  }

  const payload = result.payload;
  if (payload?.success === false) {
    return { error: payload?.message || "Failed to delete quiz (server)." };
  }

  return {
    success: true,
    message: payload?.message || "Quiz deleted successfully.",
    quizId: id,
  };
}

export async function fetchSharedExam(sharedId, userId, token) {
  const uuid = String(sharedId ?? "").trim();
  const uId = String(userId ?? "").trim();

  if (!uuid) return { error: "Missing shared quiz id." };
  if (!uId) return { error: "Missing userId." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/shared/${encodeURIComponent(uuid)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      json: { userId: uId, UUID: uuid },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to fetch shared quiz." };
  }

  const data = unwrapApiData(result.payload);
  const quiz = data?.quiz ?? data?.exam ?? data;

  if (!quiz || typeof quiz !== "object") {
    return { error: "Unexpected server response." };
  }

  return quiz;
}

export async function regenerateQuiz(quizId, token) {
  const id = String(quizId ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const result = await requestJson(`${API_URL}/quiz-ai/quiz/regenrate`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    json: { quizId: id },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to regenerate quiz." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to regenerate quiz (server)." };
  }

  const quiz = data?.quiz ?? data?.exam ?? data;
  if (!quiz || typeof quiz !== "object") {
    return { error: "Unexpected server response." };
  }

  return quiz;
}

export async function regenerateQuestion(
  quizId,
  questionId,
  questionPayload,
  token
) {
  const qzId = String(quizId ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  const result = await requestJson(
    `${API_URL}//quiz-ai/${encodeURIComponent(
      qzId
    )}/question/${encodeURIComponent(qId)}/regenerate`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Send a few compatible keys; backend expectations may vary.
      json: {
        quizId: qzId,
        questionId: qId,
        question: questionPayload,
      },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to regenerate question." };
  }

  const data = unwrapApiData(result.payload);

  if (data?.success === false) {
    return {
      error:
        data?.message ||
        result.error ||
        "Failed to regenerate question (server).",
    };
  }

  const maybeQuestion =
    data?.question ||
    data?.regeneratedQuestion ||
    data?.generatedQuestion ||
    data?.data?.question ||
    data;

  if (!maybeQuestion || typeof maybeQuestion !== "object") {
    return { error: "Unexpected server response." };
  }

  return maybeQuestion;
}

export async function deleteQuestion(quizId, questionId, token) {
  const qzId = String(quizId ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  // TODO: Replace this URL with the real backend endpoint when you have it.
  const url = `${API_URL}/quiz-ai/${encodeURIComponent(
    qzId
  )}/question/${encodeURIComponent(qId)}`;

  const result = await requestJson(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!result.ok) {
    return { error: result.error || "Failed to delete question." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to delete question (server)." };
  }

  return {
    success: true,
    message: data?.message || "Question deleted successfully.",
    quizId: qzId,
    questionId: qId,
  };
}

export async function submitExamAnswers(payload, token) {
  const userId = String(payload?.userId ?? "").trim();
  const examId = String(payload?.examId ?? payload?.quizId ?? "").trim();
  const answers = Array.isArray(payload?.answers) ? payload.answers : [];

  if (!userId) return { error: "Missing userId." };
  if (!examId) return { error: "Missing examId." };

  const cleanedAnswers = answers
    .map((a) => {
      const questionId = a?.questionId ?? a?.id ?? a?._id;
      const selectedOption = String(
        a?.selectedOption ?? a?.selected ?? a?.answer ?? ""
      ).trim();
      return { questionId, selectedOption };
    })
    .filter((a) => a.questionId != null && a.selectedOption);

  // TODO: Replace with the real backend URL when available.
  const url = `${API_URL}/quiz-ai/exams/${encodeURIComponent(examId)}/submit`;

  const result = await requestJson(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    json: {
      userId,
      examId,
      answers: cleanedAnswers,
    },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to submit exam." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to submit exam (server)." };
  }

  return data || { success: true, message: "Submitted successfully." };
}
