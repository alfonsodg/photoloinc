/**
 * Drop zone and file selection.
 *
 * A photograph can arrive three ways — picker, drag, keyboard — and all three must
 * end at the same place. Keeping that in one module means the controller only sees
 * "a file arrived" and never repeats the event plumbing.
 *
 * Only JPEG and PNG are accepted, and the check happens here rather than at the
 * model boundary: on-device inference accepts nothing else, so failing early is the
 * honest behaviour.
 */

const ACCEPTED = /^image\/(jpeg|png)$/;

/**
 * @param {object} opts
 * @param {object} opts.el         element map
 * @param {(file: File) => void} opts.onFile      a valid image was chosen
 * @param {() => void} opts.onClear               the user asked to start over
 * @param {() => void} opts.onSample              the user asked for the bundled sample
 * @param {(message: string) => void} opts.onReject  an unsupported file arrived
 */
export function wireIntake({ el, onFile, onClear, onSample, onReject }) {
  const choose = () => el.file.click();

  el.pick.addEventListener("click", (e) => {
    e.stopPropagation();
    choose();
  });

  el.drop.addEventListener("click", choose);
  el.drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose();
    }
  });

  for (const type of ["dragenter", "dragover"]) {
    el.drop.addEventListener(type, (e) => {
      e.preventDefault();
      el.drop.classList.add("dragover");
    });
  }
  for (const type of ["dragleave", "drop"]) {
    el.drop.addEventListener(type, (e) => {
      e.preventDefault();
      el.drop.classList.remove("dragover");
    });
  }

  el.drop.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handOff(file, onFile, onReject);
  });

  el.file.addEventListener("change", () => {
    const file = el.file.files?.[0];
    if (file) handOff(file, onFile, onReject);
  });

  el.sample.addEventListener("click", (e) => {
    e.stopPropagation();
    onSample();
  });

  el.reset.addEventListener("click", onClear);
}

function handOff(file, onFile, onReject) {
  if (!ACCEPTED.test(file.type)) {
    onReject("Only JPEG and PNG are supported — on-device inference accepts no other image type.");
    return;
  }
  onFile(file);
}
