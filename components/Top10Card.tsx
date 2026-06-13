import { NetflixCard } from "./NetflixCard";
import { StreamitHoverCard } from "./StreamitHoverCard";

export function Top10Card({ content, index }: { content: any, index: number }) {
  // Adjust spacing for 2-digit number (10)
  const isTwoDigits = index >= 10;
  
  return (
    <div className="relative flex justify-end h-full py-4 pl-6 md:pl-8 w-full">
       {/* Huge Number using SVG for perfectly clean strokes without internal bleeding */}
       <div className="absolute left-[-10px] md:left-[-15px] bottom-[5px] md:bottom-[0px] z-30 pointer-events-none w-[90px] h-[105px] md:w-[120px] md:h-[135px]">
         <svg width="100%" height="100%" className="overflow-visible">
           <text
             x="10"
             y="100%"
             fill="#141414"
             stroke="white"
             strokeWidth="4"
             strokeLinejoin="round"
             paintOrder="stroke fill"
             className={`text-[90px] md:text-[120px] font-black ${isTwoDigits ? 'tracking-normal' : 'tracking-tighter'}`}
             style={{ filter: "drop-shadow(4px 4px 10px rgba(0,0,0,0.6))" }}
           >
             {index}
           </text>
         </svg>
       </div>
       
       {/* Card Container */}
       <div className="relative z-20 h-full w-full ml-auto">
         <StreamitHoverCard content={content}>
           <NetflixCard content={content} type={content.type || 'movie'} />
         </StreamitHoverCard>
       </div>
    </div>
  )
}
