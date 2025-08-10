import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

type HeaderLogoProps = {
  size?: "small" | "large";
};

const sizeMap = {
  small: { width: 128, height: Math.round(128 / 3.08), sizes: "128px" },
  medium: { width: 192, height: Math.round(192 / 3.08), sizes: "192px" },
  large: { width: 256, height: Math.round(256 / 3.08), sizes: "256px" },
};

export const HeaderLogo = ({ size = "small" }: HeaderLogoProps) => {
  const { width, height, sizes } = sizeMap[size];
  return (
    <Link href="/">
      <div className="hidden items-center lg:flex">
        <Image
          src="/logo.png"
          alt="Logo"
          width={width}
          height={height}
          sizes={sizes}
          priority
        />
      </div>
    </Link>
  );
};
