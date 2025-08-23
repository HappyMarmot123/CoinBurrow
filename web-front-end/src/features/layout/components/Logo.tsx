import Link from "next/link";

export const Logo = () => {
  return (
    <article>
      <Link href="/market">
        <h1 className="text-xl font-bold logo-gradient">CoinBurrow</h1>
      </Link>
    </article>
  );
};
