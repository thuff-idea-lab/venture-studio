/**
 * Help page script — FAQ accordion toggle.
 */

document.querySelectorAll('.faq-question').forEach((btn) => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    // Close all
    document.querySelectorAll('.faq-question').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.classList.remove('open');
    });

    // Toggle current
    if (!isOpen) {
      btn.setAttribute('aria-expanded', 'true');
      answer.classList.add('open');
    }
  });
});
