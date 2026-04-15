class Wardex < Formula
  desc "SentinelEdge XDR — AI-powered endpoint detection & response"
  homepage "https://github.com/pinkysworld/Wardex"
  version "0.52.0"
  license "BSL-1.1"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/pinkysworld/Wardex/releases/download/v#{version}/wardex-macos-aarch64.tar.gz"
      # sha256 "PLACEHOLDER"
    else
      url "https://github.com/pinkysworld/Wardex/releases/download/v#{version}/wardex-macos-x86_64.tar.gz"
      # sha256 "PLACEHOLDER"
    end
  end

  on_linux do
    url "https://github.com/pinkysworld/Wardex/releases/download/v#{version}/wardex-linux-x86_64.tar.gz"
    # sha256 "PLACEHOLDER"
  end

  def install
    pkg = Dir["wardex-*"] .find { |path| File.directory?(path) }
    raise "release archive layout changed" unless pkg

    bin.install "#{pkg}/wardex"
    (share/"wardex/site").install Dir["#{pkg}/site/*"] if Dir.exist?("#{pkg}/site")
    (share/"wardex/examples").install Dir["#{pkg}/examples/*"] if Dir.exist?("#{pkg}/examples")
  end

  def post_install
    (var/"wardex").mkpath
    (var/"wardex/backups").mkpath
    (var/"log/wardex").mkpath
  end

  service do
    run [opt_bin/"wardex", "serve", "--port", "8080"]
    keep_alive true
    working_dir var/"wardex"
    log_path var/"log/wardex/wardex.log"
    error_log_path var/"log/wardex/wardex-error.log"
  end

  test do
    assert_match "wardex", shell_output("#{bin}/wardex --version")
  end
end
