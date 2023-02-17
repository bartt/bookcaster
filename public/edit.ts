class Edit {
  static handleClick() {
    document.addEventListener('click', (e) => {
      // Clicking an editable element makes it editable and places the cursor
      // in the editable content
      const element = e.target as HTMLElement;
      if (element.isContentEditable) {
        return;
      }
      // Make editable content editable
      if (element?.getAttribute('contenteditable') == 'false') {
        element.setAttribute('contenteditable', 'true');
        element.focus();
        return;
      }
      // New lines add new nodes inside the editable content. Clicks on children 
      // make the editable content edtibable again.
      const ancestor = element.closest('[contenteditable]');
      if (ancestor && !ancestor.isContentEditable) {
        ancestor.setAttribute('contenteditable', 'true');
        return;
      }
      // Clicks outside editable content makes all editable content ineditable.
      document
        .querySelectorAll('[contenteditable]')
        .forEach((item) => item.setAttribute('contenteditable', 'false'));
    });
  }
}

export { Edit };
