# Como é que o Democrac_IA realmente funciona

## Queres mesmo saber o que realmente se passa aqui?

Primeiro de tudo, tudo isto é **código aberto**! O backend e o frontend, vai aqui, podes fazer o que quiseres, podes copiar, expandir, tanto faz: [<u>GitHub</u>](https://github.com/brunu97/democrac_ia-open)

O código não está perfeito, e certamente há pontos onde é possível melhorar, se tens alguma sugestão, envia [para aqui](https://docs.google.com/forms/d/e/1FAIpQLSfp3p-MzKBBUkeyG_b_Tv3Smr9bKByWhuheWD1OqDjfU-39Pw/viewform?usp=header)

Primeiro vamos à maneira como o site funciona e de seguida à forma como os dados foram indexados.

A Pesquisa no site de forma resumida num diagrama funciona assim, é essencialmente um [RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) (Retrieval-Augmented Generation)

![Diagrama de como funciona o Democrac_IA](diagrama.png)

Toda a backend é feita em **Python** usando **Flask**, Python é ideal para tudo o que é IA e ML, há excelentes módulos para se usar.

Um dos módulos utilizados é o **SentenceTransformer**, que também é responsável pela geração dos embeddings. Escolhi o [BGE-M3](https://huggingface.co/BAAI/bge-m3) pois com base nos meus testes, apresenta um desempenho ok para Português de Portugal mas uma boa alternativa seria o E5-Multilingual-Large, no entanto existem modelos maiores mas como isto será executada via CPU num servidor comum. Por questões de performance, é necessário um modelo de dimensões médias e tanto o E5-Multilingual-Large como o BGE-M3 encaixam-se perfeitamente neste requisito e ambos são **open source**!

Depois de transformar os textos em vetores, estes beep boops podem ir para o FAISS fazer a pesquisa.

---

### **O FAISS**

**Facebook AI Similarity Search** ou simplesmente **FAISS** é uma biblioteca de pesquisa vetorial desenvolvida pela Meta pela equipa do Facebook IA (daí o nome). É usada para encontrar os vetores mais semelhantes a um vetor de consulta em uma grande base de dados vetoriais.

Não é exatamente uma Inteligência Artificial por si, mas sim uma biblioteca extremamente eficiente a encontrar dados.

O Resultado do embedding do passo anterior é utilizado aqui para o FAISS procurar dados relevantes.

FAISS é **Open Source** e existem outras alternativas, tal como o ChromaDB, no entanto FAISS é incrivelmente rápido e leve e foi a razão de o ter escolhido.

Todos os textos estão guardados numa base de dados em **SQLite**, textos estes que são Chunks dos documentos originais que foram indexados.

---

### **A Magia acontece - LLM com RAG**

Depois de se encontrar toda a informação relevante, todos os dados incluindo um conjunto de instruções destinadas ao system prompt da LLM são enviados para esta fase do processo.

O sucesso da resposta depende diretamente da **qualidade das fontes** utilizadas e do **system prompt** que orienta o comportamento do modelo. O ficheiro de prompts descreve de forma detalhada como a IA deve analisar as fontes e estruturar as suas respostas.

Inicialmente, isto foi desenvolvido com o **Ollama** a funcionar como servidor local. No entanto, para um ambiente de produção, o Ollama não é a opção mais adequada. A alternativa é o **vLLM** que é ideal para aplicações web com múltiplos utilizadores, mas o custo é bastante elevado para manter um servidor desses assim.

Por esse motivo esta aplicação recorre ao **groq** (sem qualquer relação com o Grok do X/Twitter). **groqCloud** É um serviço rápido e económico, o que o torna uma excelente escolha para estes cenários.

Durante a fase de desenvolvimento, o modelo escolhido foi o **Qwen 2.5 7B**, desenvolvido pela Alibaba que também é open source, tal como todas as restantes tecnologias utilizadas até aqui.

**Mas porquê um modelo tão pequeno?** perguntas tu! Bem... hospedar modelos maiores é caro 😅, MAS o Qwen 2.5 7B é excelente na comunicação em português de Portugal. Uma alternativa viável seria o **LLaMA 2 7B**, da Meta, mas nos testes realizados o Qwen demonstrou ser significativamente melhor a seguir instruções, **de qualquer forma a ideia de usar um servidor dedicado com a vLLM acabou por ser abandonada devido aos custos elevados de manter um servidor dedicado** a executar estas LLMs, mesmo sendo modelos bastante eficientes e leves.

Atualmente, a aplicação realiza a sua inferência diretamente no **groqCloud**, utilizando o **LLaMA 3.1 8B** como principal porque é barato e rápido. O serviço também suporta o **Qwen 3 32B**, que poderá vir a ser utilizado no futuro caso seja necessário, mas também existem outros modelos no groq e a depender do custo, esta aplicação poderá a começar a usar modelos melhores.

Todo o frontend é feito em **Angular**, não haveria nada de mal em utilizar o Flask diretamente com templates para fazer o site, mas Angular é mais fácil de gerir.

---

### **A Extração de dados**

![Diagrama de extração de dados](diagrama2.png)

Talvez a parte mais difícil seja a extração dos PDFs dos debates do Parlamento. Inicialmente, a ideia ia bem para além de só dos debates, mas como todo o conteúdo que o site tem, desde 1821 (aproveito já para agradecer o trabalho incrível que o pessoal do parlamento fez a transcrever tudo isto e ter tudo digitalizado), dificuldades técnicas surgiram rapidamente. Não só a resolução de vários ficheiros não é a ideal para um computador ler, como o esforço do hardware para processar isto seria enorme, então decidi focar só nos debates a partir de 2006.

Todos os PDFs foram extraídos com o devido cuidado do site do parlamento, com um script de crawl que demorou imenso tempo a percorrer o site e encontrar os ficheiros de debates e fazer download um a um dos PDFs. No total, foram cerca de **1900 PDFs**.

Depois disso estar feito, entra a parte de transformar isto tudo em embeddings usando **pytorch** e o modelo **BGE-M3**, coisa que felizmente posso acelerar com **ROCm**. Sendo o meu GPU da AMD, uma RX 7800XT, posso usar o GPU para fazer isto mais rápido. Originalmente o processo demorava mais de 10 horas seguidas 😫! mas depois de várias experiências e otimizações de momento demora cerca de **uma hora e meia**! CUDA seria sempre a opção ideal mas requer GPU NVIDIA.

A Indexação do pdf da Constituição já foi feito de forma diferente e mais complexa, como é um PDF pequeno não iria ter os problemas de memoria e performance que é indexar os quase 2000 pdfs dos debates, portanto a forma como os dados da constituição estão indexados no FAISS tem melhor qualidade e um maior tamanho.

A estrutura de cada PDF é semelhante ao longo dos anos dos documentos, no entanto há algumas alterações, como por exemplo a lista de presença existe nos mais antigos mas não nos novos, mas a variação entre PDFs não é suficiente para causar ruídos significativos na pesquisa.

Tudo é armazenado na base de dados e indexado no FAISS.

---

## Notícias em Tempo Real

O Democrac_IA tem um feed de notícias de política portuguesa atualizado automaticamente a cada **2 horas**. As notícias são recolhidas automaticamente de duas fontes através de RSS do Sapo e do Google, que filtra apenas por assuntos nacionais.

### Como funciona o resumo?

De cada vez que as notícias são atualizadas, os títulos e descrições são enviados para uma LLM que gera um resumo dos principais temas do momento. O resumo é baseado **exclusivamente** no que os títulos e descrições dizem.