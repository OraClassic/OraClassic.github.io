document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.highlight pre').forEach((pre) => {
    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.innerText = "Copy";

    button.addEventListener("click", () => {
      const code = pre.innerText;
      navigator.clipboard.writeText(code).then(() => {
        button.innerText = "Copied!";
        setTimeout(() => {
          button.innerText = "Copy";
        }, 2000);
      }).catch((err) => {
        console.error('복사 실패:', err);
        button.innerText = "Error";
      });
    });

    pre.parentNode.style.position = "relative";
    pre.parentNode.appendChild(button);
  });
});
