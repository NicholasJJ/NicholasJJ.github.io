
const faceImages = [
    'faceClean.png',
    'faceBeard.png',
    'faceVR.png',
    'faceWiz.png'
    // Add more image filenames here
];


const faceImg = document.querySelector('.face');


let lastImage = faceImg.src;

function getRandomImage() {
    let randomIndex;
    let newImage;

    do {
        randomIndex = Math.floor(Math.random() * faceImages.length);
        newImage = `images/faces/${faceImages[randomIndex]}`;
    } while (newImage === lastImage);

    return newImage;
}

faceImg.addEventListener('click', function() {
    const newImage = getRandomImage();
    faceImg.src = newImage;
    lastImage = newImage;  
});
