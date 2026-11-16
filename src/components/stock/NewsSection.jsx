// Latest news for a symbol (existing NewsTab, capped height).
import NewsTab from "../NewsTab";
import SectionHeader from "../ui/SectionHeader";

export default function NewsSection({ symbol }) {
  return (
    <>
      <SectionHeader title="News" />
      <div className="sb-embed" style={{ maxHeight: 520, overflow: "auto" }}><NewsTab symbol={symbol} /></div>
    </>
  );
}
