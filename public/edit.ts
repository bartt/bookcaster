class Edit {
  static handleClick() {
    document.addEventListener('click', (e) => {
      // Clicking an editable element makes it editable and places the cursor in the editable content
      if (e.target?.classList.contains('editable')) {
        e.target.setAttribute('contenteditable', true);
        e.target.focus();
      }
    });
  }
}

export { Edit };
