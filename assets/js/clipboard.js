document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('pre > code').forEach((codeBlock) => {
    const button = document.createElement("button");
    button.className = "copy-button";
    button.type = "button";
    button.innerText = "Copy";

    button.addEventListener("click", () => {
      navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        button.innerText = "Copied!";
        setTimeout(() => {
          button.innerText = "Copy";
        }, 2000);
      });
    });

    const pre = codeBlock.parentNode;
    if (pre.parentNode.classList.contains("highlight")) {
      pre.parentNode.insertBefore(button, pre);
    } else {
      pre.insertBefore(button, codeBlock);
    }
  });
});
