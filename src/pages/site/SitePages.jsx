import {
  Hero, StatsBand, AboutTeaser, AboutBlock, ValuesBand, CalendarBlock, FeaturedEvents,
  CoursesBlock, GalleryStrip, GalleryGrid, ProcessTeaser, ProcessStepper, Requirements, PageHero,
} from '../../components/site/sections.jsx';

export function Home() {
  return (
    <>
      <Hero />
      <StatsBand />
      <FeaturedEvents />
      <AboutTeaser />
      <CoursesBlock teaser />
      <ProcessTeaser />
      <GalleryStrip />
    </>
  );
}

export function About() {
  return (
    <>
      <PageHero eyebrow="About" title="About" accent="PIFSA" image="/images/gallery-1.jpg"
        subtitle="SEC-registered and PRC CPD-accredited, training the people who pursue the truth in the Philippine justice system." />
      <AboutBlock />
      <StatsBand />
      <ValuesBand />
    </>
  );
}

export function Calendar() {
  return (
    <>
      <PageHero eyebrow="Calendar" title="2027 Training" accent="Calendar" image="/images/gallery-9.jpg"
        subtitle="Every training duration and program for the year, plus the events now open for registration." />
      <FeaturedEvents title="Open for registration" subtitle="Our featured programs and events. Hover a card to see the full details." />
      <CalendarBlock />
    </>
  );
}

export function Courses() {
  return (
    <>
      <PageHero eyebrow="Courses" title="Professional Certificate" accent="Programs" image="/images/gallery-5.jpg"
        subtitle="Ten competency-based programs in investigation, forensic science and intelligence. Each program is ₱25,000." />
      <CoursesBlock />
    </>
  );
}

export function Gallery() {
  return (
    <>
      <PageHero eyebrow="Gallery" title="Moments from the" accent="field" image="/images/gallery-8.jpg"
        subtitle="Training sessions, moot court presentations and closing ceremonies. Click a photo to view it larger." />
      <GalleryGrid />
    </>
  );
}

export function Process() {
  return (
    <>
      <PageHero eyebrow="Process" title="How to" accent="enroll" image="/images/gallery-3.jpg"
        subtitle="Four steps from your first message to your certificate, plus the requirements you need to prepare." />
      <div className="process-section">
        <div className="process-inner">
          <ProcessStepper />
          <Requirements />
        </div>
      </div>
    </>
  );
}
