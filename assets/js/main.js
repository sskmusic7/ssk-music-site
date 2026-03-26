/*----------------------------------------------------*/
/*	AJAX
/*----------------------------------------------------*/



function delay(n) {
	n = n || 1700;
	return new Promise((done) => {
		setTimeout(() => {
			done();
		}, n);
  
   
	});
  }

barba.init({ 
	transitions: [
	  {
		  async leave() {
			  const done = this.async();
			  gsap.to(".tavonline-overlay", { duration: 1, width:'104%', ease: "Expo.easeInOut" }); 
			  await delay(1000);
			  done();
		  },

		  async enter() {    
			 $('main').imagesLoaded( function() {   
				setTimeout(() => {scrollTrigger(); }, 700);
			 gsap.to(".tavonline-overlay", { duration: 1,  width:'0%',   'right' : 'auto', 'left' : '0',   ease: "Expo.easeInOut",  delay: .5,  });
			  gsap.set(".tavonline-overlay", {delay: 2, clearProps:"all" });
			 ajaxLoad();
		   }); 
		  	 window.scrollTo(0, 0);
		  },
	  },
  ],
  });


function ajaxLoad(){
	header();
	musicPlayer();
	bottomPlayer();
	videoPlayer();
	heroSlider();
	discoSlider();
	discoSliderTwo();
	testimonialSlider();
	tabMenu();
	MemberSlider();
	parallaxHero();
	newsSlider();
	popupVideo();
	gallery();
	hero_five();
	masonry();
	tilt();
	downArrow();
	splitText();

  }

  ajaxLoad();


/*----------------------------------------------------*/
/*	PRELOADER
/*----------------------------------------------------*/

function preloader(){

	Splitting();
	
	var number1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
	var number2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
	
	var numeral1= '';
	for (var n = 0; n < number1.length; ++ n){
		numeral1 += '<span>' + number1[n] + '</span>';
	}
	
	var numeral2= '';
	for (var n = 0; n < number2.length; ++ n){
		numeral2 += '<span>' + number2[n] + '</span>';
	}
	
	$('.preloader').append('<div class="outer"><div class="inner"><div class="numbers"><div class="numbers-wrap"><div class="number one"></div><div class="number two"></div><div class="number three"></div></div></div><p class="body-three">Loading</p></div></div>');
	
	$('.preloader .numbers .number.one').html(numeral1);
	$('.preloader .numbers .number.two').html(numeral2);
	$('.preloader .numbers .number.three').html('<span>%</span><span>0</span>');
	
	
	loaderAnimation = gsap.timeline({
		yoyo: true,
		onComplete: function(){ gsap.to('.preloader', 1, { y:'-100%', ease: ':Power2.easeInOut'} ); scrollTrigger(); }
	});
	
	loaderAnimation.to('.number.one', 5, {
		y: '-91%',
		ease: 'power2.inOut',
	}, .5)
	
	loaderAnimation.to('.number.two', 5, {
		y: '-95.3%',
		ease: 'power2.inOut',
	}, .5)
	
	loaderAnimation.to('.number.three', 2.5, {
		y: '0%',
		ease: 'power2.inOut',
	}, .1 )
	
	loaderAnimation.to('.number.three', 2, {
		y: '-52%',
		ease: 'power2.Out',
	}, 4.6)
	
	loaderAnimation.to('.numbers .number', .6, {
		y: '-100%',
		ease: 'power2.in',
		stagger: .1,
	}, 6)
	
	
	gsap.fromTo('.preloader p',{autoAlpha:.3}, { duration:1, autoAlpha:0, repeat:-1, yoyo:true});
	
}

preloader();


/*----------------------------------------------------*/
/*	DOWN ANIMATION
/*----------------------------------------------------*/

function downArrow(){
	if( $('.hero-1').length ){
	 $('.down-arrow').on('click', function(){
		 $('body,html').animate({ scrollTop: $('.hero-1').height() }, 800);
	 });
	}
}


/*----------------------------------------------------*/
/*	SPLIT TEXT
/*----------------------------------------------------*/
function splitText(){
  
	splitLines = new SplitText(".text-anime", {
	  type: "lines",
	  linesClass: "text-lines"
	});
  
	$(".text-anime .text-lines").wrap('<div class="line-wrapper">');
  }


/*----------------------------------------------------*/
/*	SCROLL TRIGGER
/*----------------------------------------------------*/

function scrollTrigger(){
	$('.text-anime').each(function(){
		gsap.to( $(this).find('.text-lines'),{ 
		  y: 0,
		  stagger:.1,
		  delay : $(this).data('delay') ? $(this).data('delay') : 0,
		  duration:1.1,
			scrollTrigger: {
			  trigger: $(this),
			  start: 'top bottom-=10%',
			  end: "center 100px",
			  }
		});
	  });

	$('.image-anime').each(function(){
		gsap.from( $(this).find('img'),{ 
		  scale: 1.4,
		  duration:1,
			scrollTrigger: {
			  trigger: $(this),
			  start: "top bottom-=20%",
			  end: "center 100px",
			  onEnter: () =>  $(this).addClass('revealed'),
			}
		});
	});

	$('.video-anime').each(function(){
		ScrollTrigger.create({
				trigger: $(this),
				start: "top bottom-=20%",
				end: "center 100px",
				onEnter: () =>  {
				  $(this).addClass('revealed'),
				  jQuery(this).find('video').get(0).play()
			  },
			  });
	  });

	$('.progress-anime').each(function(){
		gsap.from( $(this).find('.amplitude-song-played-progress'),{ 
		  width: 0,
		  delay : $(this).data('delay') ? $(this).data('delay') : 0,
		  duration:1,
			scrollTrigger: {
			  trigger: $(this),
			  start: "top bottom-=20%",
			  end: "center 100px",
			}
		});
	});

	$('.fade-in').each(function(){
		gsap.from( $(this),{ 
		  y: 30,
		  autoAlpha:0,
		  delay : $(this).data('delay') ? $(this).data('delay') : 0,
		  duration:1,
			scrollTrigger: {
			  trigger: $(this),
			  start: "top bottom-=" + $(this).data('start') ? $(this).data('start') : '20%',
			  end: "center 100px",
			}
		});
	});

	$('.fade-right').each(function(){
		gsap.from( $(this),{ 
		  x: 30,
		  autoAlpha:0,
		  delay : $(this).data('delay') ? $(this).data('delay') : 0,
		  duration:1,
			scrollTrigger: {
			  trigger: $(this),
			  start: "top bottom-=20%",
			  end: "center 100px",
			}
		});
	});


	$('.clip-animation').each(function(){
		gsap.to( $(this),{ 
			clipPath: "polygon(-2% 0%, 100% 0%, 105% 100%, 0% 100%)",
			delay : $(this).data('delay') ? $(this).data('delay') : 0,
			duration : $(this).data('duration') ? $(this).data('duration') : 0.7,
			scrollTrigger: {
			  trigger: $(this),
			  start: "top bottom-=20%",
			  end: "center 100px",
			}
		});
	});

	if( $('.hero-3').length ){
		gsap.to('.hero-3 .image', 1.7, { 'height': '55vh', autoAlpha:1, y:0, delay:1, scale:1,  ease: "Expo.easeInOut" });
		gsap.set('.hero-3',{ 'height': 'auto', delay:2.7 });
		gsap.to('.hero-3 .image', 1.5, { 'height': '25vh', delay:2.7, ease: "Expo.easeInOut" });
		gsap.set('.hero-3 .image', {'position':'relative'});
		gsap.from('.hero-3 .title, .line-scroll', 1, { autoAlpha:0, delay:2.3, ease: ':Power2.easeInOut' });
		gsap.from('header', 1, { autoAlpha:0, delay:2.3, ease: ':Power2.easeInOut' });
		gsap.from('.hero-3 .listen-on', 1, { autoAlpha:0, delay:3, ease: ':Power2.easeInOut' });
	}



	
}



/*----------------------------------------------------*/
/*	FIRST LOAD
/*----------------------------------------------------*/
function FirstLoad(){

	// HOME 1
	gsap.to('.hero-1 .image', 1.5, { 'clipPath':"polygon(-10% 0%, 100% 0%, 100% 100%, 0% 100%)", delay:1,  ease: 'Power3.easeOut'});
	gsap.from('.hero-1 .title h1', .5, {y:'100%', autoAlpha:0, delay:1});
	gsap.from('.hero-1 .subheading', .3, {y:'100%', autoAlpha:0, delay:1.2});

	// HOME 2
	gsap.from('.hero-2', 1, {scale:1.1, ease: ':Power2.easeInOut' });
	gsap.from('.hero-2 .swiper-pagination-bullet:first-child .word .char', 1, {y:'100%', autoAlpha:0, ease: ':Power2.easeInOut'});
	gsap.from('.hero-2 .subheading', 1, {autoAlpha:0, ease: ':Power2.easeInOut' });
	gsap.from('.hero-2 .bottom-area', 1, {autoAlpha:0, ease: ':Power2.easeInOut' });

	// HOME 3 
	if( $('.hero-3').length ){
		gsap.to('.hero-3 .image', 1.7, { 'height': '55vh', autoAlpha:1, y:0, delay:1, scale:1,  ease: "Expo.easeInOut" });
		gsap.set('.hero-3',{ 'height': 'auto', delay:2.7 });
		gsap.to('.hero-3 .image', 1.5, { 'height': '25vh', delay:2.7, ease: "Expo.easeInOut" });
		gsap.set('.hero-3 .image', {'position':'relative'});
		gsap.from('.hero-3 .title, .line-scroll', 1, { autoAlpha:0, delay:2.3, ease: ':Power2.easeInOut' });
		gsap.from('header', 1, { autoAlpha:0, delay:2.3, ease: ':Power2.easeInOut' });
		gsap.from('.hero-3 .listen-on', 1, { autoAlpha:0, delay:3, ease: ':Power2.easeInOut' });
	}

	// HOME 4 
	if( $('.hero-4').length ){
		gsap.from('.hero-4 .parallax-item img', .8, { autoAlpha:0, delay:1, ease: "Expo.easeInOut" })
		gsap.from('.hero-4 .text-1', 1.1, { x:-100, autoAlpha:0, delay:1.4 })
		gsap.from('.hero-4 .text-2', 1.1, { x:100, autoAlpha:0, delay:1.4 })
		gsap.from('.hero-4 .right-bottom', 1.1, { x:100, autoAlpha:0, delay:1.6 })
	}

	// HOME 5
	if( $('.hero-5').length ){
		gsap.from('.hero-5 .swiper-slide-prev', .8, { autoAlpha:0, y:100, delay:.6})
		gsap.from('.hero-5 .swiper-slide-active', .8, { autoAlpha:0, y:100, delay:.8 })
		gsap.from('.hero-5 .swiper-slide-next', .8, { autoAlpha:0, y:100, delay:1 })
		gsap.from('.hero-5 .slider-bottom', .8, { autoAlpha:0, y:200, delay:1.2 })
	}

	// HOME 6
	if( $('.hero-6').length ){
		gsap.from('.hero-6 .image', .8, { autoAlpha:0, y:100, 'scale':'1.2', delay:.7})
		gsap.from('.hero-6 .subtitle', .8, { autoAlpha:0, x:-100,  delay:1})
		gsap.from('.hero-6 h1', .8, { autoAlpha:0, x:-100,  delay:1.2})
		gsap.from('.hero-6 p', .8, { autoAlpha:0, x:-100, delay:1.4})
		gsap.from('.hero-6 .bottom-player', .6, { autoAlpha:0, y:200, delay:1.8})
	}

	// HOME 7
	if( $('.hero-7').length ){
		gsap.from('.hero-7 .title, .hero-7 .subheading', .8, { autoAlpha:0, y:100, delay:.7})
		gsap.from('.hero-7 .album-cover', .8, { autoAlpha:0, y:100, delay:.9})
		gsap.from('.hero-7 .progress', .8, { width:'0%', delay:1})
		gsap.from('.hero-7 .playing-time', .8, { autoAlpha:0, y:100,  delay:1.3})
		gsap.from('.hero-7 .controls', .8, { autoAlpha:0, y:100,  delay:1.5})
		gsap.from('.hero-7 .album-name', .8, { autoAlpha:0, y:100,  delay:1.6})
		gsap.from('.hero-7 .list-song', .8, { autoAlpha:0, y:100, stagger:.2,  delay:1.7})
		gsap.from('.hero-7 .volume-controls', .8, { autoAlpha:0, y:100,  delay:2.2})
	}

		// HOME 7
		if( $('.hero-8').length ){
			gsap.from('.hero-8 .bg-image', .8, { autoAlpha:0, delay:.7})
			gsap.from('.hero-8 .date', .8, { autoAlpha:0, y:100, delay:1})
			gsap.from('.hero-8 .title', .8, { autoAlpha:0, y:100, delay:1.1})
			gsap.from('.hero-8 p', .8, { autoAlpha:0, y:100, delay:1.2})
			gsap.from('.hero-8 .bottom-buttons', .8, { autoAlpha:0, y:100, delay:1.5})
		}

}


/*----------------------------------------------------*/
/*	HEADER
/*----------------------------------------------------*/

function header(){
	var menu_animation = gsap.timeline({yoyo: false,reversed: true});
	menu_animation.pause();
	menu_animation.to(".overlay-menu", .5, { autoAlpha:1, 'pointer-events': 'all',  ease: Power3.easeOut});
	menu_animation.from(".overlay-menu nav li:not(.overlay-menu nav ul li ul li)", .5, { stagger:.1, autoAlpha:0, y:30,  ease: Power3.easeOut});

	$('.hamburger-menu, .burger-desktop, .overlay-menu .close').on('click', function(){
		menu_animation.reversed() ? menu_animation.play():menu_animation.reverse();
		$('nav li.active ul').slideUp();
		$('nav li').removeClass('active');
	});


	$('.overlay-menu nav ul li a span').each(function(){
	var thisText = $(this).text();
	$(this).attr('data-hover', thisText);
	});


	$(".overlay-menu nav li:not(.overlay-menu nav ul ul li)").hover(function(){
	}, function(){
		$(this).siblings().find('span').css("opacity", "1");
	});


	$("nav a").click(function() {
		var link = $(this);
		var closest_ul = link.closest("ul");
		var parallel_active_links = closest_ul.find(".active")
		var closest_li = link.closest("li");
		var link_status = closest_li.hasClass("active");
		var count = 0;

		closest_ul.find("ul").slideUp(function() {
				if (++count == closest_ul.find("ul").length)
						parallel_active_links.removeClass("active");
		});

		if (!link_status) {
				closest_li.children("ul").slideDown();
				closest_li.addClass("active");
		}
	})
 

	var showAnim = gsap.from('header', { 
		yPercent: -100,
		paused: true,
		duration: 0.4
	}).progress(1);
	
	
	ScrollTrigger.create({
		start: "100px",
		end: 99999,
		onUpdate: (self) => {
		self.direction === -1 ? showAnim.play() : showAnim.reverse()
		}
	});
	
	$(window).on('scroll', function(){	
	var scroll = $(window).scrollTop();	
	if (scroll > 500 ) {												
		$("header").addClass('scrolling');
		} else {	
			$("header").removeClass('scrolling');
		}   
	}); 
	
	var social_animation = gsap.timeline({yoyo: false,reversed: true});
	social_animation.pause();
	social_animation.to("header", .5, { autoAlpha:0, ease: Power3.easeOut},0);
	social_animation.to(".social-mobile", .5, { autoAlpha:1, 'pointer-events': 'all',  ease: Power3.easeOut}, 0);
	social_animation.from(".social-mobile a", .5, { stagger:.1, autoAlpha:0, y:30,  ease: Power3.easeOut});

	$('.social-trigger, .social-mobile .close').on('click', function(){
		social_animation.reversed() ? social_animation.play():social_animation.reverse();
		$('nav li.active ul').slideUp();
		$('nav li').removeClass('active');
	});

	function isTouchDevice() {
		return (('ontouchstart' in window) ||
		   (navigator.maxTouchPoints > 0) ||
		   (navigator.msMaxTouchPoints > 0));
	  }
	  
	  const myFlag = isTouchDevice();

	  if (myFlag) { $(".menu-item-has-children > a").removeAttr("href");}
	  
}



/*----------------------------------------------------*/
/*	MUSIC PLAYER
/*----------------------------------------------------*/

function musicPlayer(){
	let songElements = document.getElementsByClassName('song');

	$('.list-song').each(function() {
		var thisIndex = $(this).index(); 
		$(this).attr('data-amplitude-song-index', thisIndex);
	});

	$('.play-list .list-song').each(function(){
		var album,albumcover,title;
		artist=$(this).data('artist');
		albumcover=$(this).data('cover');
		title=$(this).data('title');
		albumcover=albumcover?'<div class="image" style="background-image: url('+albumcover+')"></div>':'';
		title=title?'<div class="song-title">'+title+'</div>':'Unknown Title';

		$(this).html('<div class="row gx-0"><div class="col-xl-10 col-md-8 col-8"><div class="outer"><div class="inner"><div class="song-info">'+title+'<div class="song-album">'+artist+' </div></div></div></div></div><div class="col-xl-2 col-md-4 col-4"><div class="outer"><div class="inner"><div class="song-duration fade-in">  <span class="amplitude-duration-minutes"></span><span class="amplitude-duration-seconds"></span></div></div></div></div></div>');


	});


	var bboxArray = [];
	$('.list-song').each(function() {
		var song = {};
		var url = $(this).data('url');
		var name = $(this).data('title');
		var album = $(this).data('album');
		var artist = $(this).data('artist');
		var cover = $(this).data('cover');
		song.url =  url;
		song.album = album;
		song.name = name;
		song.artist = artist;
		song.cover_art_url = cover;
		bboxArray.push(song);

	});

		Amplitude.init({
			"songs":
					bboxArray,
		"callbacks": {
				'play': function(){
					document.getElementById('album-art').style.visibility = 'hidden';
					document.getElementById('large-visualization').style.visibility = 'visible';
				},
		
				'pause': function(){
					document.getElementById('album-art').style.visibility = 'visible';
					document.getElementById('large-visualization').style.visibility = 'hidden';
				}
			},
		});

	// create audio elements - to read songs duration
		let audio_arr = [];
		bboxArray.forEach((song, index) => {
		const audio = document.createElement('audio');
		audio.src = song.url;
		audio_arr.push(audio)
		});
		
		audio_arr.forEach((audio, index) => {
			audio.addEventListener('loadeddata', () => {
			const minutes = Math.floor(audio.duration / 60);
			const seconds = Math.floor(audio.duration % 60);
			document.querySelectorAll('.song-duration')[index].innerHTML = `${minutes}:${seconds > 10 ? seconds : '0'+seconds}`;
			});
		});

}


/*----------------------------------------------------*/
/*	MUSIC PLAYER 2
/*----------------------------------------------------*/

function bottomPlayer(){
	if( $('.bottom-player').length ){
	
		var mp3 = $('.list-song').data('url');
		Amplitude.init({
			"bindings": {
			  37: 'prev',
			  39: 'next',
			  32: 'play_pause'
			},
			"songs": [
			  {
				"url": mp3,
			  }
			]
		  });
		
		  window.onkeydown = function(e) {
			  return !(e.keyCode == 32);
		  };
		
		  document.getElementById('song-played-progress').addEventListener('click', function( e ){
			var offset = this.getBoundingClientRect();
			var x = e.pageX - offset.left;
		
			Amplitude.setSongPlayedPercentage( ( parseFloat( x ) / parseFloat( this.offsetWidth) ) * 100 );
		  });
	}
	
	function hoverSrc(){
		var albumSrc = $('.album-art').attr('src');
		$('.album-hover').attr('src', albumSrc);
	}
	hoverSrc();
	$('.list-song, .amplitude-next, .amplitude-prev').on('click', function(){
		setTimeout(() => {
			hoverSrc();
		}, 1000);
		gsap.fromTo(".album-hover", {opacity: 1}, {opacity: 0, duration: 1});
	});
}






/*----------------------------------------------------*/
/*	VIDEO SLIDER
/*----------------------------------------------------*/

function videoPlayer() {

	if($('.video-js').length){

	var videoSwiper = new Swiper(".video-slider", {
		// Slider options
		slidesPerView: 2,
		centeredSlides: true,
		spaceBetween: 150,
		loop: true,
		grabCursor:true,
		loopAdditionalSlides: true,
		noSwipingClass: "swiper-no-swiping",
		navigation: {
		  prevEl: ".video-slider .left-arrow",
		  nextEl: ".video-slider .right-arrow"
		},
		breakpoints: {
			1024: {
			  slidesPerView: 2,
			  centeredSlides:true,
			  spaceBetween: 90
			},
			991: {
			  slidesPerView: 1,
			  spaceBetween: 60
			}
		  }
  
	  });

		var videoElements = document.querySelectorAll(".video-js");
		
	  
		videoElements.forEach(function(video, index) {
			video.id = "video-js-" + index;
			var player = videojs.getPlayers()[video.id];
			if (!player) {
			  player = videojs(video.id, {
				fill: true,
				responsive: true,
				autoplay: false
			  });
			}else{
				player.dispose();
				player = videojs(video.id, {
				  fill: true,
				  responsive: true,
				  autoplay: false
				});
			}
		  });

  
	  videoSwiper.on('slideChangeTransitionStart', function () {
		videoElements.forEach(function(video) {
			var player = videojs(video.id);
			player.pause();
			//player.currentTime(0);
			player.hasStarted(false);
		  });
		});
	}

	
}


/*----------------------------------------------------*/
/*	HERO 2 SLIDER
/*----------------------------------------------------*/

function heroSlider(){
	

	interleaveOffset = 0.5;
	var titles = [];
	var subheading = [];

	$('.hero-2-slider .swiper-slide').each(function(i) {
		titles.push($(this).data('title'));
		subheading.push($(this).data('subheading'))
	});
	
	var swiper = new Swiper(".hero-2-slider", {
	  direction: "horizontal",
	  loop: false,
	  grabCursor: true,
	  resistance : true,
	  resistanceRatio:0.5,
	  slidesPerView: 1,
	  allowTouchMove:true,  
	  speed:900,
	  autoplay: false,
	  pagination: {
		  el: '.slider-content',
		  clickable: true,
		  renderBullet: function (index, className) {
			  return '<div class="outer ' + className + '">' + '<div class="inner">' + '<div class="subheading">' + subheading[index] + '</div>' + '<div class="title" data-splitting><h3>'  + titles[index] + '</h3></div>' + '</div>' + '</div>';
			   
		  },
	  },
	  navigation: {
		  nextEl: ".fa-chevron-right",
		  prevEl: ".fa-chevron-left",
	  },
	  on: {
	
		  progress: function(){
			  var swiper = this;
			  for (var i = 0; i < swiper.slides.length; i++) {
				var slideProgress = swiper.slides[i].progress,
					innerOffset = swiper.width * interleaveOffset,
					innerTranslate = slideProgress * innerOffset;
				swiper.slides[i].querySelector(".image").style.transform =
				  "translate3d(" + innerTranslate + "px, 0, 0)";
			  }
			},
			touchStart: function() {
			  var swiper = this;
			  for (var i = 0; i < swiper.slides.length; i++) {
				swiper.slides[i].style.transition = "";
			  }
			},
		  setTransition: function(speed) {
			  var swiper = this;
			  for (var i = 0; i < swiper.slides.length; i++) {
				  swiper.slides[i].style.transition = speed + "ms";
				  swiper.slides[i].querySelector(".image").style.transition = speed + "ms";
			  }   
		   },
		   slideChange: function () {
			   // counter
			   var counterNumber = document.getElementById("counter-number");
			   var slidenumber = swiper.activeIndex;
			   gsap.to(counterNumber, 0.3, {
				   opacity: 0,
				   transform: "translateY(10px)",
				   ease: "Expo.easeInOut",
				   onComplete: () => {
					   counterNumber.innerText =
						   slidenumber > 9 ? slidenumber : "0" + (slidenumber + 1);
					   gsap.fromTo(
						   counterNumber,
						   0.3,
						   {
							   opacity: 0,
							   transform: "translateY(10px)",
						   },
						   {
							   opacity: 1,
							   transform: "translateY(0px)",
							   ease: "Expo.easeInOut",
						   }
					   );
				   },
			   });
		   }, 
		   slideNextTransitionStart: function () {	
			  var prevslidecontent = new TimelineLite();
			  prevslidecontent.staggerTo($('.swiper-pagination-bullet-active').prev().find('.subheading'), 0.3, {y:-60, opacity:0, delay:0, ease:Power2.easeIn})
			  var prevslidetitle = new TimelineLite();						
			  prevslidetitle.staggerTo($('.swiper-pagination-bullet-active').prev().find('.title'), 0.4, {y:-60, opacity:0, delay:0.1, ease:Power2.easeInOut})
			  var activeslidecontent = new TimelineLite();
			  activeslidecontent.staggerTo($('.swiper-pagination-bullet-active').find('.subheading'), 0.5, {y:0, opacity:1, scale:1, delay:0.5, ease:Power2.easeOut})
			  var activeslidetitle = new TimelineLite();												
			  activeslidetitle.staggerTo($('.swiper-pagination-bullet-active').find('.title'), 0.5, {y:0, opacity:1, scale:1, delay:0.6, ease:Power2.easeOut})
													  
			  var nextslidecontent = new TimelineLite();	
			  nextslidecontent.staggerTo($('.swiper-pagination-bullet-active').next().find('.subheading'), 0.3, {y:60, opacity:0, delay:0, ease:Power2.easeIn})		
			  var nextslidetitle = new TimelineLite();						
			  nextslidetitle.staggerTo($('.swiper-pagination-bullet-active').next().find('.title'), 0.5, {y:60, opacity:0, ease:Power2.easeInOut})
			  
			  var tl = new TimelineLite();
			  
			  $('.swiper-pagination-bullet-active').prev().find('.counter').each(function(index, element) {
				  tl.to(element, 0.3, {scale:1, y:-20, opacity:0, ease:Power2.easeIn}, index * 0.01)
			  });
			  
			  $('.swiper-pagination-bullet-active').find('.counter').each(function(index, element) {
				  tl.to(element, 0.4, {scale:1, y:0, opacity:1, scale:1, delay:0.3, ease:Power2.easeOut}, index * 0.01)
			  });
			  
			  $('.swiper-pagination-bullet-active').next().find('.counter').each(function(index, element) {
				  tl.to(element, 0.3, {scale:1, y:20, opacity:0, ease:Power2.easeIn}, index * 0.01)
			  });						
			  
		  },
		  slidePrevTransitionStart: function () {							
			  var prevslidecontent = new TimelineLite();
			  prevslidecontent.staggerTo($('.swiper-pagination-bullet-active').prev().find('.subheading'), 0.3, {y:-60, opacity:0, delay:0, ease:Power2.easeIn})
			  var prevslidetitle = new TimelineLite();						
			  prevslidetitle.staggerTo($('.swiper-pagination-bullet-active').prev().find('.title'), 0.4, {y:-60, opacity:0, delay:0, ease:Power2.easeInOut})
									  
			  
			  var activeslidecontent = new TimelineLite();
			  activeslidecontent.staggerTo($('.swiper-pagination-bullet-active').find('.subheading'), 0.5, {y:0, opacity:1, scale:1, delay:0.5, ease:Power2.easeOut})
			  var activeslidetitle = new TimelineLite();												
			  activeslidetitle.staggerTo($('.swiper-pagination-bullet-active').find('.title'), 0.5, {y:0, opacity:1, scale:1, delay:0.4, ease:Power2.easeOut})
													  
			  
			  var nextslidecontent = new TimelineLite();	
			  nextslidecontent.staggerTo($('.swiper-pagination-bullet-active').next().find('.subheading'), 0.3, {y:60, opacity:0, delay:0.1, ease:Power2.easeIn})		
			  var nextslidetitle = new TimelineLite();						
			  nextslidetitle.staggerTo($('.swiper-pagination-bullet-active').next().find('.title'), 0.5, {y:60, opacity:0, delay:0, ease:Power2.easeInOut})
			  
			  var tl = new TimelineLite();
			  
			  $('.swiper-pagination-bullet-active').prev().find('.counter').each(function(index, element) {
				  tl.to(element, 0.3, {scale:1, y:-20, opacity:0, delay:0.1,  ease:Power2.easeIn}, index * 0.01)
			  });
			  
			  $('.swiper-pagination-bullet-active').find('.counter').each(function(index, element) {
				  tl.to(element, 0.4, {scale:1, y:0, opacity:1, scale:1, delay:0.45, ease:Power2.easeOut}, index * 0.01)
			  });
			  
			  $('.swiper-pagination-bullet-active').next().find('.counter').each(function(index, element) {
				  tl.to(element, 0.3, {scale:1, y:20, opacity:0, delay:0.1,  ease:Power2.easeIn}, index * 0.01)
			  });					
			  
		  },
	  },
	});
}




/*----------------------------------------------------*/
/*	DISCOGRAPHY SLIDER
/*----------------------------------------------------*/

function discoSlider(){
	var discoswiper = new Swiper(".discography-slider", {
		slidesPerView: 3,
		centeredSlides:true,
		loop:true,
		spaceBetween: 90,
		speed:1000,
		autoplay:{
			delay:3000,
		},
		loopAdditionalSlides: true,
		navigation: {
			prevEl: ".discography-slider .left-arrow",
			nextEl: ".discography-slider .right-arrow",
		},
		breakpoints: {
			1024: {
			  slidesPerView: 2,
			  centeredSlides:true,
			  spaceBetween: 10
			},
			580: {
			  slidesPerView: 2,
			  spaceBetween: 5
			}
		  }
	  });
}



/*----------------------------------------------------*/
/*	DISCOGRAPHY SLIDER 2
/*----------------------------------------------------*/

function discoSliderTwo(){

	var diswiper2 = new Swiper(".discography-slider-2", {
		slidesPerView: 5,
		centeredSlides:true,
		loop:true,
		spaceBetween: 45,
		speed:1000,
		loopAdditionalSlides: true,
		autoplay: {
			delay:3500
		},
		navigation: {
			nextEl: ".discography-2 .right, .discography-3 .right",
			prevEl: ".discography-2 .left, .discography-3 .left",
		},
		breakpoints: {
			1024: {
			  slidesPerView: 2,
			  centeredSlides:true,
			  spaceBetween: 45,
			},
			580: {
			  slidesPerView: 2,
			  spaceBetween: 30,
			}
		  }
	  });
}



/*----------------------------------------------------*/
/*	TESTIMONIAL SLIDER
/*----------------------------------------------------*/

function testimonialSlider(){
	var tesswiper = new Swiper(".testimonial-slider", {
		loop:true,
		loopAdditionalSlides: true,
		navigation: {
			nextEl: ".testimonials .left-arrow",
			prevEl: ".testimonials .right-arrow",
		},
		speed:1000,
		autoplay: {
			delay:3500,
		}
	  });
}




/*----------------------------------------------------*/
/*	TAB MENU
/*----------------------------------------------------*/

function tabMenu() {
	if($('.fiddle-tabs').length){
		$('çtabs-nav li:first-child').addClass('active');
		$('.tab-content').hide();
		$('.tab-content:first').show();
		
		// Click function
		$('.tabs-nav li').click(function(){
		  $('.tabs-nav li').removeClass('active');
		  $(this).addClass('active');
		  $('.tab-content').hide();
		  
		  var activeTab = $(this).find('a').attr('href');
		  $(activeTab).fadeIn();
		  return false;
		});
	}
}



/*----------------------------------------------------*/
/*	MEMBER SLIDER 2
/*----------------------------------------------------*/

function MemberSlider(){
	var teamSwiper = new Swiper(".member-slider", {
		slidesPerView: 4,
		centeredSlides:true,
		loop:true,
		spaceBetween: 45,
		loopAdditionalSlides: true,
		speed:750,
		autoplay: {
			delay:3500
		},
		breakpoints: {
			1024: {
			  slidesPerView: 3,
			},
			580: {
			  slidesPerView: 1.1,
			  spaceBetween: 45,
			}
		  },
		navigation: {
			nextEl: ".members-3 .arrows .right",
			prevEl: ".members-3 .arrows .left",
		},
	  });
}




/*----------------------------------------------------*/
/*	HERO 4
/*----------------------------------------------------*/

function parallaxHero(){
	var timeout;
	$('.hero-4').mousemove(function(e){
	  if(timeout) clearTimeout(timeout);
	  setTimeout(callParallax.bind(null, e), 200);
	  
	});

	
	function callParallax(e){
	  parallaxIt(e, '.text-1', -70);
	  parallaxIt(e, '.text-2', -100);
	  parallaxIt(e, '.parallax-item', 40);
	}
	
	function parallaxIt(e, target, movement){
	  var $this = $('.hero-4');
	  var relX = e.pageX - $this.offset().left;
	  
	  gsap.to(target, 1, {
		x: (relX - $this.width()/2) / $this.width() * movement,
		ease: Power2.easeOut
	  })
	}
}



/*----------------------------------------------------*/
/*	NEWS SLIDER
/*----------------------------------------------------*/

function newsSlider(){
	var newsSlider = new Swiper(".news-slider", {
		slidesPerView: 3.5,
		loop:true,
		spaceBetween: 45,
		speed:750,
		loopAdditionalSlides: true,
		autoplay: {
			delay:3500
		},
		navigation: {
			prevEl: ".news.slider .bottom-items .fa-arrow-left-long",
			nextEl: ".news.slider .bottom-items .fa-arrow-right-long",
		},
		breakpoints: {
			1024: {
			  slidesPerView: 3,
			},
			580: {
			  slidesPerView: 1,
			  spaceBetween: 30,
			}
		  }
	  });
}


/*----------------------------------------------------*/
/*	POPUP VIDEO
/*----------------------------------------------------*/

function popupVideo(){
	$('.popup-youtube').magnificPopup({
		disableOn: 700,
		type: 'iframe',
		mainClass: 'mfp-fade',
		removalDelay: 160,
		preloader: false,
		fixedContentPos: false,
	});
}

/*----------------------------------------------------*/
/*	GALLERY
/*----------------------------------------------------*/

function gallery(){
	if( $('.lightbox').length ){
		$('.lightbox').attr('data-barba-prevent', 'all');
		$('.lightbox').magnificPopup({
			  type:'image',
			  zoom:{enabled: true, duration: 300},
			  gallery: {
				enabled: true
			  },
		  });
	}
	
	$('a.lightbox').on('mouseenter', (event) => {
		document.createElement('img').src = event.currentTarget.href
	})
}

/*----------------------------------------------------*/
/*	HERO 5
/*----------------------------------------------------*/

function hero_five(){
	var heroswiper = new Swiper(".hero-carousel", {
		direction: "horizontal",
		loop: true,
		grabCursor: true,
		resistance : true,
		resistanceRatio:0.5,
		slidesPerView: 'auto',
		allowTouchMove:true,  
		speed:1000,
		autoplay: false,
		centeredSlides: true,
		spaceBetween: 0,
		navigation: {
			nextEl: ".hero-5 .fa-chevron-right",
			prevEl: ".hero-5 .fa-chevron-left",
		},
	  });
	
}
        
/*----------------------------------------------------*/
/*	MASONRY & ISOTOPE
/*----------------------------------------------------*/

function masonry(){
	if ( $('.masonry').length ){
		var $container = $('.masonry');  
		$container.imagesLoaded( function() {   
			$container.isotope({
			itemSelector: '.grid-item',
			sortBy : 'parseInt',
			gutter:0,
			transitionDuration: "0.5s",
			columnWidth: '.grid-item'
			});
		});
		$('.filter-list ul li').on("click", function(){
			$(".filter-list ul li").removeClass("select-cat");
			$(this).addClass("select-cat");        
			var selector = $(this).attr('data-filter');
			$(".masonry").isotope({
				filter: selector,
				animationOptions: {
					duration: 750,
					easing: 'linear',
					queue: false,
		}
		});
			return false;
		});   
	
		$('.filter-name, .filter-list ul li, .portfolio-filter i').on('click', function(e){
		e.stopPropagation();
			$('.filter-list').toggleClass('opened');
		});
	
		$(document).click(function () {
		$('.filter-list').removeClass('opened');
		});
	
		$('.filter-list ul li').on('click', function(){
		$('.filter-name').text($(this).text() + ' ' + $('.filter-name').data('works'));
	});   
	}
	
}

/*----------------------------------------------------*/
/*	TILT EFFECT
/*----------------------------------------------------*/

function tilt(){
	if($('.tilt').length){
		var cardWrap = document.getElementsByClassName('tilt');
		document.body.addEventListener('mousemove', cursorPositionHandler);
		
		function cursorPositionHandler(e) {
			var decimalX = e.clientX / window.innerWidth - 0.5;
			var decimalY = e.clientY / window.innerHeight - 0.5;
			gsap.to(cardWrap, 1.2, { rotationY: 10 * decimalX, rotationX: 10 * decimalY, ease: Quad.easeOut, scale:1.1, transformPerspective: 2000, transformOrigin: "center" });
		}
	}
}
