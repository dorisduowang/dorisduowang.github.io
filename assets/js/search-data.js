// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "About",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-projects",
          title: "Projects",
          description: "Research projects in behavioral economics, computational social science, and AI system design.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-publications",
          title: "Publications",
          description: "Published papers and working papers.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "Academic Curriculum Vitae",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "nav-teaching",
          title: "Teaching",
          description: "Teaching experience at the University of Chicago.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/teaching/";
          },
        },{id: "news-started-the-m-a-in-computational-social-science-economics-at-the-university-of-chicago-supported-by-the-gargoyle-research-scholarship-social-science-promise-scholarship-and-m-a-director-s-scholarship",
          title: 'Started the M.A. in Computational Social Science (Economics) at the University of Chicago,...',
          description: "",
          section: "News",},{id: "news-joined-as-teaching-assistant-for-econ-17100-introduction-to-international-trade-prof-timothy-hersey-at-uchicago-leading-weekly-discussion-sections",
          title: 'Joined as Teaching Assistant for ECON 17100: Introduction to International Trade (Prof. Timothy...',
          description: "",
          section: "News",},{id: "news-completed-v5-simulations-for-punishment-on-demand-adaptive-surprisal-triggered-enforcement-achieves-higher-cooperation-0-763-vs-0-695-at-less-than-half-the-enforcement-cost-of-always-on-punishment",
          title: 'Completed v5 simulations for Punishment on Demand — adaptive surprisal-triggered enforcement achieves higher...',
          description: "",
          section: "News",},{id: "projects-auditing-text-based-reward-signals",
          title: 'Auditing Text-Based Reward Signals',
          description: "Testing whether text-based rewards track scientific value in AI-driven scientific discovery",
          section: "Projects",handler: () => {
              window.location.href = "/projects/chorus_audit/";
            },},{id: "projects-fomc-communication-amp-s-amp-p-500-volatility",
          title: 'FOMC Communication &amp;amp; S&amp;amp;P 500 Volatility',
          description: "Analyzing how Fed communication dynamics and media narratives drive financial market volatility",
          section: "Projects",handler: () => {
              window.location.href = "/projects/fomc_communication/";
            },},{id: "projects-cooperation-in-large-scale-repeated-games",
          title: 'Cooperation in Large-Scale Repeated Games',
          description: "B.Sc. Dissertation — Behavioral analysis of cooperation, punishment, and regrouping mechanisms",
          section: "Projects",handler: () => {
              window.location.href = "/projects/kcl_dissertation/";
            },},{id: "projects-lstm-vs-arima-for-gold-forecasting",
          title: 'LSTM vs. ARIMA for Gold Forecasting',
          description: "Comparative analysis of sequence modeling architectures for financial time series",
          section: "Projects",handler: () => {
              window.location.href = "/projects/lstm_arima/";
            },},{id: "projects-punishment-on-demand",
          title: 'Punishment on Demand',
          description: "Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games",
          section: "Projects",handler: () => {
              window.location.href = "/projects/punishment_on_demand/";
            },},{
        id: 'social-cv',
        title: 'CV',
        section: 'Socials',
        handler: () => {
          window.open("/assets/pdf/Duo_Wang_CV.pdf", "_blank");
        },
      },{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%64%6F%72%69%73%64%75%6F%77%61%6E%67@%75%63%68%69%63%61%67%6F.%65%64%75", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/dorisduowang", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
