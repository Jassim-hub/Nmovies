import { NetflixCard } from "./NetflixCard";
import { StreamitHoverCard } from "./StreamitHoverCard";

export function Top10Card({ content, index }: { content: any, index: number }) {
  // Adjust spacing for 2-digit number (10)
  const isTwoDigits = index >= 10;
  
  return (
    <div className="relative flex justify-end h-full py-4 pl-8 md:pl-12 w-full">
       {/* Huge Number using SVG for perfectly clean strokes without internal bleeding */}
       <div className="absolute left-[-15px] md:left-[-25px] bottom-[-5px] md:bottom-[-10px] z-30 pointer-events-none w-[120px] h-[140px] md:w-[160px] md:h-[180px]">
         <svg width="100%" height="100%" className="overflow-visible">
           <text
             x="10"
             y="100%"
             fill="#141414"
             stroke="white"
             strokeWidth="5"
             strokeLinejoin="round"
             paintOrder="stroke fill"
             className={`text-[120px] md:text-[160px] font-black ${isTwoDigits ? 'tracking-normal' : 'tracking-tighter'}`}
             style={{ filter: "drop-shadow(4px 4px 10px rgba(0,0,0,0.6))" }}
           >
             {index}
           </text>
         </svg>
       </div>
       
       {/* Card Container */}
       <div className="relative z-20 h-full w-[120px] md:w-[150px] lg:w-[160px] ml-auto">
         <StreamitHoverCard content={content}>
           <NetflixCard content={content} type={content.type || 'movie'} />
         </StreamitHoverCard>
       </div>
    </div>
  )
}
