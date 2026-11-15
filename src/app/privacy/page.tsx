export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl">What Daybrief collects</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-semibold">Gmail</h2>
          <p className="text-muted">
            For each recent thread: sender, subject, Gmail&apos;s short preview, dates and read state. Full
            message text is fetched only at the moment you ask for a draft reply, and is not stored. The app
            can create drafts. It cannot and does not send, archive or delete mail. Promotions, social, spam
            and trash are skipped.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Browsing and YouTube</h2>
          <p className="text-muted">
            The Chrome extension reports the address, page title and active time of the tab you are looking
            at, plus the channel name on YouTube videos. Query strings are removed before anything is stored.
            Page contents, form input and incognito windows are never recorded. Sites on the blocklist
            (banking, health, mail, password managers, and any you add) never leave your browser. You can
            pause recording at any time.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">AI processing</h2>
          <p className="text-muted">
            Email previews, page titles and domain names are sent to an AI model through the Neon AI
            Gateway to sort mail and write the plan. Nothing is sold or shared with anyone else.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Storage and your control</h2>
          <p className="text-muted">
            Data lives in a private Postgres database. The Google sign-in token is encrypted. In Settings you
            can download everything as a file or delete it all permanently.
          </p>
        </section>
      </div>
    </main>
  );
}
