import { digestMessage } from './crypto.js';

class Edit {
  static handleClick() {
    document.addEventListener('click', async (e) => {
      // Clicking an editable element makes it editable and places the cursor
      // in the editable content
      const element = e.target as HTMLElement;
      if (element.isContentEditable) {
        return;
      }
      // Make editable content editable
      if (element?.getAttribute('contenteditable') == 'false') {
        element.setAttribute(
          'data-checksum',
          await digestMessage(element.innerHTML)
        );
        element.setAttribute('contenteditable', 'true');
        element.focus();
        return;
      }
      // New lines add new nodes inside the editable content. Clicks on children
      // make the editable content edtibable again.
      const ancestor = element.closest('[contenteditable]') as HTMLElement;
      if (ancestor && !ancestor.isContentEditable) {
        ancestor.setAttribute('contenteditable', 'true');
        ancestor.setAttribute(
          'data-checksum',
          await digestMessage(ancestor.innerHTML)
        );
        return;
      }
      // Clicks outside editable content makes all editable content ineditable.
      document
        .querySelectorAll('[contenteditable=true]')
        .forEach(async (item) => {
          item.setAttribute('contenteditable', 'false');
          const oldSha1 = item.getAttribute('data-checksum');
          if (!oldSha1) {
            return;
          }
          item.removeAttribute('data-checksum');
          const newSha1 = await digestMessage(item.innerHTML);
          if (oldSha1 != newSha1) {
            const field = item.getAttribute('data-field');
            const value = item.innerHTML;
            // Bring up saving notification
            alert(`SAVE: ${oldSha1}/${newSha1}: ${field} = ${value}`);
            // Save the changes to the DB.
            // Hide saving alert when done.
          }
        });
    });
  }
}

export { Edit };
