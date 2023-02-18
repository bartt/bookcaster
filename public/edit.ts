import { digestMessage } from './crypto.js';
import { Api } from './api.js';

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
            const bookElement = document.querySelector('.book');
            if (!bookElement) {
              // There always should be a book. Escape hatch.
              return;
            }
            const bookId = bookElement.id.split('-').pop();
            const field = item.getAttribute('data-field');
            if (!field) {
              return;
            }
            const value = item.innerHTML;
            // Bring up saving notification
            // alert(`SAVE ${bookId}: ${oldSha1}/${newSha1}: ${field} = ${value}`);
            // Save the changes to the DB.
            const response = await Api.update(`book/${bookId}`, {
              field,
              value,
            });
            // Hide saving alert when done and update the editable field with the saved value.
            item.innerHTML = response[field];
          }
        });
    });
  }
}

export { Edit };
