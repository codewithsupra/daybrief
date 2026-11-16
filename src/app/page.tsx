import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { Reveal } from "@/components/landing/reveal";
import { currentUserId } from "@/lib/session";
import "./landing.css";

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

const SIGNALS = [
  ["var(--c-creator)", "Priya: onboarding checklist", "email"],
  ["var(--warn)", "Electricity bill due 22 Nov", "email"],
  ["var(--c-work_learning)", "github.com", "38m"],
  ["var(--c-entertainment)", "YouTube: football highlights", "47m"],
  ["var(--c-social)", "reddit.com", "34m"],
] as const;

const TASKS = [
  ["Reply to Priya about onboarding", "She asked yesterday. Two items left.", "10m"],
  ["Pay the electricity bill", "Due in six days.", "5m"],
  ["Outline your first video", "No progress on this goal all week.", "30m"],
  ["Keep YouTube under 20 minutes", "It took 47 minutes yesterday.", "5m"],
] as const;

const MAIL = [
  ["Marcus Lee", "Can you share the prototype before Friday?", "Reply", "var(--c-creator)"],
  ["City Utilities", "Your bill is ready", "Due 22 Nov", "var(--warn)"],
  ["Rahul Mehta", "Intro to the video editor", "No answer, 6d", "var(--c-social)"],
  ["Dev Weekly", "Issue 412: what's new", "Skipped", "#656b74"],
] as const;

// height %, then work / entertainment / social shares
const BARS = [
  [62, 5, 3, 2],
  [78, 4, 4, 2],
  [70, 6, 2, 2],
  [55, 3, 5, 2],
  [88, 5, 4, 3],
  [74, 4, 5, 1],
  [40, 6, 2, 1],
] as const;

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="8" fill="rgba(0,229,153,.15)" />
      <path d="M4.6 8.3l2.2 2.2 4.6-4.9" fill="none" stroke="#00e599" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Landing() {
  if (await currentUserId()) redirect("/today");

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <a href="#top" className="lp-logo">
            <i />
            Daybrief
          </a>
          <nav className="lp-nav-links" aria-label="Sections">
            <a href="#what">What it does</a>
            <a href="#how">How it works</a>
            <a href="#privacy">Privacy</a>
            <a href="/demo">Demo</a>
          </nav>
          <a href="/login" className="lp-btn lp-btn-sm lp-nav-cta">
            Sign in
          </a>
        </div>
      </header>

      <main id="top">
        <section className="lp-hero">
          <div className="lp-glow" aria-hidden />
          <div className="lp-wrap">
            <h1 className="lp-h1 lp-rise">Know what to do today.</h1>
            <p className="lp-sub lp-rise d1">
              Daybrief reads your inbox and where your time went, then hands you a short plan every morning.
            </p>
            <div className="lp-cta-row lp-rise d2">
              <GoogleButton />
              <a href="/demo" className="lp-btn">
                Try the demo
              </a>
            </div>
            <p className="lp-note lp-rise d3">The demo uses sample data and needs no sign-in.</p>

            <div className="lp-scene lp-rise d4" aria-hidden>
              <div>
                <p className="lp-scene-label">Yesterday</p>
                <div className="lp-signals">
                  {SIGNALS.map(([dot, text, meta], i) => (
                    <div key={text} className="lp-signal" style={css({ "--dot": dot, animationDelay: `${0.6 + i * 0.3}s` })}>
                      <b />
                      <span>{text}</span>
                      <em>{meta}</em>
                    </div>
                  ))}
                </div>
              </div>
              <svg className="lp-beam" viewBox="0 0 120 120" preserveAspectRatio="none">
                <path d="M0 20 C60 20 60 60 120 60" />
                <path d="M0 60 L120 60" />
                <path d="M0 100 C60 100 60 60 120 60" />
                <path className="flow" d="M0 20 C60 20 60 60 120 60" />
                <path className="flow" d="M0 60 L120 60" style={{ animationDelay: "0.7s" }} />
                <path className="flow" d="M0 100 C60 100 60 60 120 60" style={{ animationDelay: "1.4s" }} />
              </svg>
              <div className="lp-plan">
                <div className="lp-plan-head">
                  Today&apos;s plan <span>4 things, about 50 min</span>
                </div>
                {TASKS.map(([title, why, mins], i) => (
                  <div
                    key={title}
                    className={`lp-task ${i === 0 ? "first" : ""}`}
                    style={{ animationDelay: `${2.2 + i * 0.35}s` }}
                  >
                    <i />
                    <p>
                      <span>{title}</span>
                      <small>{why}</small>
                    </p>
                    <em>{mins}</em>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="what" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Everything that needs you, on one screen.</h2>
            <p className="lp-lead">
              Email, browsing and your goals usually live in different places. Daybrief puts them side by side and
              tells you what matters.
            </p>

            <div className="lp-bento">
              <article className="lp-card wide" style={css({ "--glow": "var(--c-creator)" })}>
                <h3>An inbox that&apos;s already sorted</h3>
                <p>Who is waiting on you, what has a deadline, and who never wrote back. Newsletters stay out of the way.</p>
                <Reveal className="lp-visual">
                  {MAIL.map(([from, subject, tag, color], i) => (
                    <div key={from} className="lp-mail" style={css({ "--i": i })}>
                      <strong>{from}</strong>
                      <span>{subject}</span>
                      <b className="lp-tag" style={css({ "--tag": color })}>
                        {tag}
                      </b>
                    </div>
                  ))}
                </Reveal>
              </article>

              <article className="lp-card narrow" style={css({ "--glow": "var(--accent)" })}>
                <h3>Time on your goals</h3>
                <p>One number for how much of yesterday went where you wanted it to.</p>
                <Reveal className="lp-visual">
                  <div className="lp-ring">
                    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
                      <circle className="track" cx="48" cy="48" r="42" fill="none" strokeWidth="8" />
                      <circle
                        className="value"
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        transform="rotate(-90 48 48)"
                        style={css({ "--to": 264 * (1 - 0.64) })}
                      />
                    </svg>
                    <div>
                      <strong>64%</strong>
                      <span>on your goals</span>
                    </div>
                  </div>
                </Reveal>
              </article>

              <article className="lp-card half" style={css({ "--glow": "var(--c-entertainment)" })}>
                <h3>See where the week went</h3>
                <p>Time by site and by video, split into work, learning and everything else.</p>
                <Reveal className="lp-visual">
                  <div className="lp-bars">
                    {BARS.map(([h, work, fun, social], i) => (
                      <div key={i} className="lp-bar" style={css({ "--h": `${h}%`, "--i": i })}>
                        <u style={css({ "--g": work, "--c": "var(--c-work_learning)" })} />
                        <u style={css({ "--g": fun, "--c": "var(--c-entertainment)" })} />
                        <u style={css({ "--g": social, "--c": "var(--c-social)" })} />
                      </div>
                    ))}
                  </div>
                  <div className="lp-days">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </Reveal>
              </article>

              <article className="lp-card half" style={css({ "--glow": "var(--c-social)" })}>
                <h3>Replies drafted for you</h3>
                <p>One click writes a reply into your Gmail drafts. You read it, change it, and send it yourself.</p>
                <div className="lp-visual">
                  <div className="lp-draft">
                    <header>Draft to Marcus Lee</header>
                    Hi Marcus, here&apos;s the prototype link for Friday. The volunteer flow is the part I&apos;d most like
                    your eyes on
                    <i className="caret" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Set up in two minutes.</h2>
            <div className="lp-steps">
              <div className="lp-step">
                <h3>Connect Gmail</h3>
                <p>Sign in with Google. Daybrief can read your mail and create drafts, nothing more.</p>
              </div>
              <div className="lp-step">
                <h3>Add the browser extension</h3>
                <p>It notes which sites and videos you spend time on. Never what&apos;s on the page.</p>
              </div>
              <div className="lp-step">
                <h3>Get your plan each morning</h3>
                <p>Five to seven things, ranked against your goals, in your inbox and on your dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="privacy" className="lp-section">
          <div className="lp-wrap lp-privacy">
            <div>
              <h2 className="lp-h2">Your data stays yours.</h2>
              <p className="lp-lead">This only works if you can trust it with your inbox, so the limits are strict.</p>
              <a className="lp-link" href="/privacy">
                Read exactly what&apos;s collected
              </a>
            </div>
            <div className="lp-facts">
              {[
                ["Never sends, archives or deletes mail", "It can read and it can write drafts. Sending is always you."],
                ["No page contents, no incognito", "The extension records the address, title and time. That's all."],
                ["Banking, health and mail are always skipped", "Add any other site to the blocklist yourself."],
                ["Export or delete everything, any time", "One button each, in Settings."],
              ].map(([title, body]) => (
                <div key={title} className="lp-fact">
                  <Check />
                  <p>
                    <b>{title}</b>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="lp-wrap">
          <section className="lp-close">
            <h2 className="lp-h2">Start tomorrow with a plan.</h2>
            <div className="lp-cta-row">
              <GoogleButton />
              <a href="/demo" className="lp-btn">
                Try the demo
              </a>
            </div>
          </section>

          <footer className="lp-foot">
            <span className="lp-logo">
              <i />
              Daybrief
            </span>
            <a href="/demo" className="push">
              Demo
            </a>
            <a href="/privacy">Privacy</a>
            <a href="/login">Sign in</a>
          </footer>
        </div>
      </main>
    </div>
  );
}
