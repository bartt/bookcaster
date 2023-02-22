import { digestMessage } from './crypto.js';
import { Api } from './api.js';

class Editable {
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
            // Bring up saving notification.
            item.classList.add('modified');
            const value = item.innerHTML;
            // Save the changes to the DB.
            const response = await Api.update(`book/${bookId}`, {
              field,
              value,
            });
            // Hide saving alert when done and update the editable field with the saved value.
            item.classList.remove('modified');
            item.innerHTML = response[field];
          }
        });
    });

    window.addEventListener('beforeunload', (e) => {
      if (document.querySelectorAll('[contenteditable=true]').length > 0) {
        return (e.returnValue =
          'There are unsaved changes. Are you sure you want to leave?');
      }
    });
  }
}

class Listable {
  static handleClick() {
    document.addEventListener('click', (e) => {
      const item = e.target as HTMLElement;
      const type = item.closest('.authors, .categories')?.className || '';
      if (item.classList.contains('listable')) {
        alert(`Clicked ${item.classList} as ${type}`);
        // List all available authors/categories, i.e. type
        // Don't pre-load the lists as the list change when entries are added/removed?
        // Add None/Unknown option to remove the current entry

        // Select matching entry in list if available

        // How to add an entry? Allow multiple selections from the list?

        // How to add a new entry to list of authors/categories?
        // Include an element below the list of options to create a new entry.
        // Follow Wave Apps' Add Vendor exmaple.

        // Automatically remove the entry permanently when it isn't being referenced any more?

      }
    });
  }
}

export { Editable, Listable };
