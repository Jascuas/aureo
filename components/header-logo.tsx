import Image from "next/image";
import Link from "next/link";

export const HeaderLogo = () => {
  return (
    <Link href="/">
      <div className="hidden items-center lg:flex">
        {/* <Image src="/logo.svg" alt="Finance logo" height={42} width={42} /> */}
        <p className=" text-3xl font-semibold text-[#FFD700]">A</p>
        <p className=" text-2xl font-semibold text-black dark:text-white">
          ureo
        </p>
      </div>
    </Link>
  );
};
