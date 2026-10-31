const slides = document.querySelectorAll(".banner-slide");

let currentSlide = 0;
const slideDuration = 8000;

function activateSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.remove("active", "zoom-in", "zoom-out");

    if (i === index) {
      slide.classList.add("active");

      // Bir görsel yaklaşır, sonraki uzaklaşır
      if (index % 2 === 0) {
        slide.classList.add("zoom-in");
      } else {
        slide.classList.add("zoom-out");
      }
    }
  });
}

activateSlide(currentSlide);

setInterval(() => {
  currentSlide = (currentSlide + 1) % slides.length;
  activateSlide(currentSlide);
}, slideDuration);
