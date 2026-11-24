// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// Add navigation and content to the search menu.
ninja.data = [
  {
    id: "nav-about-me",
    title: "About me",
    section: "Navigation",
    handler: () => {
      window.location.href = "/portfolio/#about";
    },
  },{id: "nav-projects",
          title: "Projects",
          description: "Research on strategic interaction under incomplete information and institutional design.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-publications",
          title: "Publications",
          description: "Published work and current research papers.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-cv",
          title: "CV",
          description: "Academic CV of Doris Wang (王朵), M.A. student in Computational Social Science (Economics) at the University of Chicago. Updated November 2026.",
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
          section: "News",},{id: "news-completed-the-first-punishment-on-demand-simulation-its-language-signal-rarely-intervened-which-motivated-a-sharper-comparison-between-a-contribution-history-rule-and-the-same-rule-plus-a-disclosed-language-warning",
          title: 'Completed the first Punishment on Demand simulation. Its language signal rarely intervened, which...',
          description: "",
          section: "News",},{id: "projects-agentic-supply-chains",
          title: 'Agentic Supply Chains',
          description: "Testing how unequal AI capabilities change bargaining and coordination across a multi-tier economy",
          section: "Projects",handler: () => {
              window.location.href = "/projects/agentic_supply_chains/";
            },},{id: "projects-auditing-text-based-reward-signals",
          title: 'Auditing Text-Based Reward Signals',
          description: "Testing whether text-based rewards track scientific value in AI-driven scientific discovery",
          section: "Projects",handler: () => {
              window.location.href = "/projects/chorus_audit/";
            },},{id: "projects-news-metadata-and-market-volatility-around-fomc-meetings",
          title: 'News Metadata and Market Volatility Around FOMC Meetings',
          description: "Separating exploratory timing patterns from holdout validation around Fed meetings",
          section: "Projects",handler: () => {
              window.location.href = "/projects/fomc_communication/";
            },},{id: "projects-information-aggregation-in-ai-agent-teams",
          title: 'Information Aggregation in AI Agent Teams',
          description: "Holding private evidence fixed while changing who deliberates together",
          section: "Projects",handler: () => {
              window.location.href = "/projects/information_aggregation/";
            },},{id: "projects-group-stability-and-cooperation",
          title: 'Group Stability and Cooperation',
          description: "Comparing group stability, peer punishment, and institutional enforcement in repeated public goods games",
          section: "Projects",handler: () => {
              window.location.href = "/projects/kcl_dissertation/";
            },},{id: "projects-lstm-vs-arima-for-gold-forecasting",
          title: 'LSTM vs. ARIMA for Gold Forecasting',
          description: "Comparative analysis of sequence modeling architectures for financial time series",
          section: "Projects",handler: () => {
              window.location.href = "/projects/lstm_arima/";
            },},{id: "projects-language-monitoring-in-repeated-public-goods-games",
          title: 'Language Monitoring in Repeated Public Goods Games',
          description: "Testing when communication can improve a history-based enforcement rule",
          section: "Projects",handler: () => {
              window.location.href = "/projects/punishment_on_demand/";
            },},{id: "projects-which-reviews-identify-quality",
          title: 'Which Reviews Identify Quality?',
          description: "Separating the reviews people prefer from the reviews that help them identify quality",
          section: "Projects",handler: () => {
              window.location.href = "/projects/review_information/";
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
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/duodoriswang", "_blank");
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
