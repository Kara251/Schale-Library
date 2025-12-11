import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-lg font-bold text-primary mb-1">Schale Library</div>
            <p className="text-sm text-muted-foreground">夏莱图书馆 · 蔚蓝档案资料收集站</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              关于我们
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              联系方式
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              隐私政策
            </Link>
            <a
              href="https://github.com/Kara251/Schale-Library"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>

          <div className="text-sm text-muted-foreground text-center md:text-right">
            <p>© 2025 Schale Library</p>
            <p className="text-xs">本站与Nexon及Yostar无关</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
