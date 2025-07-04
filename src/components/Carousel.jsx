import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './Carousel.css';
import freshVeg from '../assets/11.jpg';
import organicFruits from '../assets/2.jpg';
import dairyProducts from '../assets/3.jpg';

const CarouselComponent = () => {
  const slides = [
    {
      image: freshVeg,
      title: 'ক্ষুধা নয়, কৃষকের ক্ষমতা চাই'
    },
    {
      image: organicFruits,
      title: 'সিন্ডিকেটের জাল ভাঙব, কৃষকের হাল বাঁধব'
    },
    {
      image: dairyProducts,
      title: 'থাকবো না পিছে, যাবো এগিয়ে'
    }
  ];

  return (
    <div className='bg-carousel-color'>
 <div className='bg-carousel bg-size'>
      <div className="carousel-container">
      <Carousel
        autoPlay
        infiniteLoop
        showStatus={false}
        showIndicators={false}
        showThumbs={false}
        interval={5000}
        emulateTouch
        width="100%"
        height="800px"
      >
        {slides.map((slide, index) => (
          <div key={index} className="carousel-item">
            <img src={slide.image} alt={slide.title} />
            <div className="carousel-caption">
              <h2>{slide.title}</h2>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  </div>
    </div>
 
    
  );
};

export default CarouselComponent;
