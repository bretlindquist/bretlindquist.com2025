interface Props {
  data: number[];
  isPlaying: boolean;
}

const BarsVisualizer = ({ data, isPlaying }: Props) => (
  <div className="absolute inset-0 flex items-end justify-center gap-[3px] px-6 pb-4">
    {data.map((height, i) => (
      <div
        key={i}
        className="flex-1 rounded-t-sm"
        style={{
          background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--accent)))`,
          height: `${height * 100}%`,
          opacity: isPlaying ? 0.8 + height * 0.2 : 0.2,
          transition: "height 0.08s ease-out",
        }}
      />
    ))}
  </div>
);

export default BarsVisualizer;
