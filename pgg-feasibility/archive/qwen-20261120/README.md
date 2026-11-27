# Reading communication in a repeated public goods game

Doris Wang’s interactive feasibility note examines the public messages of four Qwen3-8B agents in one 15-round public goods game. A history rule determines when punishment is active. DistilGPT2 scores 56 of the 60 messages after play. The note explores what those scores capture in this game.

Read the [original interactive article](https://dorisduowang.github.io/pgg-feasibility/) or browse the [source snapshot](https://github.com/dorisduowang/dorisduowang.github.io/tree/84a4f56c43dc6cc70afb6ea6f0c1847946ff7b12/pgg-feasibility) in the personal site repository. The standalone files mirror the release served by the original site.

## Preview the article

Run `python3 -m http.server 8000` from this directory and open `http://localhost:8000/`. The page loads its charts and code excerpts from the included JSON files.

## Reproduce the scoring

Unzip `qwen-scoring-reproduction.zip` and follow its README to score the archived agent messages with the pinned model checkpoint. For a quick look at the published measurements, open `round_scores.csv` or `message_scores.csv`.
