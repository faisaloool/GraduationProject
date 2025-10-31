import React from "react";

export const Input = () => {
  return (
    <>
<form class="file-form">
  <label class="add-file">
    <input type="file" class="inputfile" />
    <span class="folder-icon">📁</span>
    <span class="text">Add File</span>
    <span class="sound-wave">
      <span></span><span></span><span></span>
    </span>
  </label>

  <button type="submit" class="generate-btn">Generate Quiz</button>
</form>

    </>
  );
};
