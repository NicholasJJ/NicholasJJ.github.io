// Select all face images
const faceImages = document.querySelectorAll('.face');

// Keep track of the current visible image index (whichever image the markup
// marks .active, so the first click never leaves two faces showing)
let currentIndex = Math.max(0, Array.from(faceImages).findIndex(f => f.classList.contains('active')));

// Function to switch to a new random image
function switchRandomImage() {
    let randomIndex;

    // Ensure we don't pick the same image as the current one
    do {
        randomIndex = Math.floor(Math.random() * faceImages.length);
    } while (randomIndex === currentIndex);

    // Hide the current image
    faceImages[currentIndex].classList.remove('active');

    // Show the new random image
    faceImages[randomIndex].classList.add('active');

    // Update the current index
    currentIndex = randomIndex;
}

// Event listener for clicking on the face container
document.querySelector('.face-container').addEventListener('click', function() {
    switchRandomImage();
});
