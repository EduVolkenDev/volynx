-- Demo PropertyFlow · Aurora Imóveis
-- Gerado por gerar-seed.mjs em 2026-11-03T04:27:15.463Z
-- Demonstração com dados fictícios
--
-- Alvo: tenant PropertyFlow com subdomínio "aurora-demo"
-- Modo: insert-only (ignora linhas existentes)
--
-- NÃO rode isto em tenant de cliente. O bloco recusa site com domínio próprio.
-- O DO abaixo é atômico: ou insere tudo, ou não insere nada.
-- Sem begin/commit explícito para não deixar a sessão em transação abortada
-- quando uma das guardas dispara.

do $$
declare
  v_target_subdomain text := 'aurora-demo';
  v_site_id          uuid;
  v_org_id           uuid;
  v_domain           text;
  v_template         text;
  v_matches          integer;
  v_inserted         integer := 0;
begin
  select count(*) into v_matches
  from public.sites s
  where lower(coalesce(s.subdomain, '')) = lower(v_target_subdomain);

  if v_matches > 1 then
    raise exception 'Mais de um site usa o subdomínio % (% ocorrências). Renomeie antes de rodar o seed.', v_target_subdomain, v_matches;
  end if;

  select s.id, s.organization_id, s.domain, s.template_key
    into v_site_id, v_org_id, v_domain, v_template
  from public.sites s
  where lower(coalesce(s.subdomain, '')) = lower(v_target_subdomain)
  order by s.updated_at desc
  limit 1;

  if v_site_id is null then
    raise exception 'Tenant PropertyFlow com subdomínio % não encontrado. Crie o tenant da demo antes de rodar o seed.', v_target_subdomain;
  end if;

  if v_template is distinct from 'property-flow' then
    raise exception 'O site % não é um tenant PropertyFlow (template_key = %).', v_target_subdomain, coalesce(v_template, 'null');
  end if;

  if v_org_id is null then
    raise exception 'O site % não tem organization_id. Corrija o cadastro antes do seed.', v_target_subdomain;
  end if;

  if coalesce(trim(v_domain), '') <> '' then
    raise exception 'O site % tem domínio próprio (%). Este seed é só para demo. Abortado.', v_target_subdomain, v_domain;
  end if;

  insert into public.property_listings (
    organization_id,
    site_id,
    slug,
    title,
    category,
    listing_type,
    status,
    summary,
    description,
    price_amount,
    price_currency,
    price_label,
    location,
    features,
    whatsapp_message,
    is_featured,
    sort_order,
    published_at
  ) values
    (v_org_id, v_site_id, 'cobertura-duplex-moinhos', 'Cobertura duplex nos Moinhos de Vento', 'Cobertura', 'sale', 'published', 'Terraço privativo, luz natural o dia inteiro e acabamento em madeira natural.', 'Cobertura duplex com planta ampla e integrada, pensada para receber. O terraço privativo tem espaço para estar e jantar, com vista aberta do bairro. A suíte principal ocupa o piso superior, com closet e banheira.', 2480000.00, 'BRL', 'R$ 2.480.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Moinhos de Vento","label":"Moinhos de Vento, Porto Alegre"}'::jsonb, '["Terraço privativo","3 suítes","3 vagas","210 m²","Closet e banheira","Vista aberta"]'::jsonb, 'Olá! Tenho interesse na cobertura duplex nos Moinhos de Vento.', true, 1, now()),
    (v_org_id, v_site_id, 'apartamento-bela-vista', 'Apartamento reformado na Bela Vista', 'Apartamento', 'sale', 'published', 'Reforma recente, dois dormitórios e uma varanda que funciona como escritório.', 'Apartamento reformado com marcenaria planejada e iluminação desenhada. A varanda foi integrada ao living e hoje serve como espaço de trabalho. Prédio com portaria 24 horas e uma vaga coberta.', 890000.00, 'BRL', 'R$ 890.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Bela Vista","label":"Bela Vista, Porto Alegre"}'::jsonb, '["2 dormitórios","1 suíte","2 vagas","98 m²","Varanda integrada","Portaria 24h"]'::jsonb, 'Olá! Tenho interesse no apartamento reformado na Bela Vista.', false, 2, now()),
    (v_org_id, v_site_id, 'studio-cidade-baixa', 'Studio mobiliado na Cidade Baixa', 'Studio', 'rent', 'published', 'Pronto para morar, a duas quadras da Redenção e do centro.', 'Studio mobiliado com planta inteligente e boa entrada de luz. Cozinha compacta equipada e armários até o teto. Localização caminhável, com mercado, café e transporte na mesma rua.', 2400.00, 'BRL', 'R$ 2.400/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Cidade Baixa","label":"Cidade Baixa, Porto Alegre"}'::jsonb, '["Mobiliado","1 banheiro","38 m²","Cozinha equipada","Aceita pet","Sem vaga"]'::jsonb, 'Olá! Tenho interesse no studio mobiliado na Cidade Baixa.', false, 3, now()),
    (v_org_id, v_site_id, 'casa-tristeza', 'Casa com jardim na Tristeza', 'Casa', 'sale', 'published', 'Quatro dormitórios, jardim maduro e uma área de fundo com churrasqueira.', 'Casa de rua com recuos generosos e jardim já formado. O living se abre para a área externa por portas de vidro. No fundo, churrasqueira coberta e espaço para bicicletas.', 1150000.00, 'BRL', 'R$ 1.150.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Tristeza","label":"Tristeza, Porto Alegre"}'::jsonb, '["4 dormitórios","3 banheiros","2 vagas","240 m²","Jardim","Churrasqueira"]'::jsonb, 'Olá! Tenho interesse na casa com jardim na Tristeza.', false, 4, now()),
    (v_org_id, v_site_id, 'apartamento-auxiliadora', 'Apartamento amplo na Auxiliadora', 'Apartamento', 'rent', 'published', 'Três dormitórios, dois deles em suíte, em rua arborizada.', 'Apartamento de planta tradicional, com ambientes bem separados e pé-direito alto. A sala tem duas faces de luz e comporta sala de jantar e estar. Prédio com dois elevadores e portaria.', 4200.00, 'BRL', 'R$ 4.200/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Auxiliadora","label":"Auxiliadora, Porto Alegre"}'::jsonb, '["3 dormitórios","2 suítes","2 vagas","120 m²","Pé-direito alto","Rua arborizada"]'::jsonb, 'Olá! Tenho interesse no apartamento amplo na Auxiliadora.', false, 5, now()),
    (v_org_id, v_site_id, 'sala-comercial-moinhos', 'Sala comercial nos Moinhos de Vento', 'Sala comercial', 'rent', 'published', 'Andar inteiro com recepção, duas salas e copa, em endereço de escritórios.', 'Conjunto comercial com entrada independente e recepção. Duas salas fechadas e uma área aberta que comporta seis estações de trabalho. Ar-condicionado instalado e ponto de fibra.', 6800.00, 'BRL', 'R$ 6.800/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Moinhos de Vento","label":"Moinhos de Vento, Porto Alegre"}'::jsonb, '["145 m²","2 salas fechadas","3 vagas","Ar-condicionado","Ponto de fibra","Recepção"]'::jsonb, 'Olá! Tenho interesse na sala comercial nos Moinhos de Vento.', false, 6, now()),
    (v_org_id, v_site_id, 'cobertura-petropolis', 'Cobertura triplex em Petrópolis', 'Cobertura', 'sale', 'published', 'Piscina aquecida, quatro suítes e vista para o Guaíba.', 'Cobertura triplex com três pavimentos conectados por escada escultural e elevador privativo. A área externa tem piscina aquecida, deck e cozinha de apoio. A vista se abre para o rio e para a cidade.', 3200000.00, 'BRL', 'R$ 3.200.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Petrópolis","label":"Petrópolis, Porto Alegre"}'::jsonb, '["Piscina aquecida","4 suítes","4 vagas","320 m²","Elevador privativo","Vista para o Guaíba"]'::jsonb, 'Olá! Tenho interesse na cobertura triplex em Petrópolis.', true, 7, now()),
    (v_org_id, v_site_id, 'apartamento-menino-deus', 'Apartamento funcional no Menino Deus', 'Apartamento', 'sale', 'published', 'Dois dormitórios, uma vaga e ótima relação entre área e preço.', 'Apartamento com planta objetiva e sem corredores perdidos. A cozinha é aberta para a sala e tem bancada de refeições. Prédio com elevador e portaria, a poucos minutos do centro.', 640000.00, 'BRL', 'R$ 640.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Menino Deus","label":"Menino Deus, Porto Alegre"}'::jsonb, '["2 dormitórios","1 banheiro","1 vaga","72 m²","Cozinha aberta","Portaria"]'::jsonb, 'Olá! Tenho interesse no apartamento no Menino Deus.', false, 8, now()),
    (v_org_id, v_site_id, 'casa-vila-assuncao', 'Casa renovada na Vila Assunção', 'Casa', 'sale', 'published', 'Estrutura antiga preservada, instalações novas e pátio com árvore centenária.', 'Casa renovada com cuidado: esquadrias restauradas, instalações elétricas e hidráulicas novas. O pátio central organiza a circulação e traz luz para todos os ambientes. Cozinha ampla com ilha.', 980000.00, 'BRL', 'R$ 980.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Vila Assunção","label":"Vila Assunção, Porto Alegre"}'::jsonb, '["3 dormitórios","2 banheiros","2 vagas","165 m²","Pátio central","Cozinha com ilha"]'::jsonb, 'Olá! Tenho interesse na casa renovada na Vila Assunção.', false, 9, now()),
    (v_org_id, v_site_id, 'studio-bom-fim', 'Studio compacto no Bom Fim', 'Studio', 'rent', 'published', '32 m² bem resolvidos, mobiliado e a cinco minutos do parque.', 'Studio com marcenaria sob medida que resolve cozinha, armazenamento e cama. Banheiro com box de vidro e ventilação natural. Prédio pequeno, com poucas unidades por andar.', 1900.00, 'BRL', 'R$ 1.900/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Bom Fim","label":"Bom Fim, Porto Alegre"}'::jsonb, '["Mobiliado","32 m²","1 banheiro","Marcenaria sob medida","Sem vaga","Prédio pequeno"]'::jsonb, 'Olá! Tenho interesse no studio compacto no Bom Fim.', false, 10, now()),
    (v_org_id, v_site_id, 'terreno-belem-novo', 'Terreno plano em Belém Novo', 'Terreno', 'sale', 'published', '360 m², frente para rua asfaltada e viabilidade para duas unidades.', 'Terreno plano e seco, com frente de 12 metros. A vizinhança é residencial e consolidada, com comércio a poucas quadras. Documentação regular e sem pendências.', 420000.00, 'BRL', 'R$ 420.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Belém Novo","label":"Belém Novo, Porto Alegre"}'::jsonb, '["360 m²","12 m de frente","Rua asfaltada","Terreno plano","Documentação regular"]'::jsonb, 'Olá! Tenho interesse no terreno em Belém Novo.', false, 11, now()),
    (v_org_id, v_site_id, 'apartamento-rio-branco', 'Apartamento no Rio Branco', 'Apartamento', 'rent', 'published', 'Dois dormitórios, sacada e vista para o parque.', 'Apartamento com sacada voltada para o parque e boa ventilação cruzada. Sala com espaço para home office e cozinha separada. Uma vaga coberta e bicicletário no prédio.', 3100.00, 'BRL', 'R$ 3.100/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Rio Branco","label":"Rio Branco, Porto Alegre"}'::jsonb, '["2 dormitórios","1 banheiro","1 vaga","88 m²","Sacada","Vista para o parque"]'::jsonb, 'Olá! Tenho interesse no apartamento no Rio Branco.', false, 12, now()),
    (v_org_id, v_site_id, 'cobertura-bela-vista', 'Cobertura com terraço na Bela Vista', 'Cobertura', 'sale', 'published', 'Três suítes e um terraço de 40 m² voltado para o pôr do sol.', 'Cobertura com living em dois ambientes e lareira a etanol. O terraço tem ponto de água e gás, pronto para uma cozinha externa. As três suítes têm armários planejados.', 1780000.00, 'BRL', 'R$ 1.780.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Bela Vista","label":"Bela Vista, Porto Alegre"}'::jsonb, '["3 suítes","3 vagas","160 m²","Terraço de 40 m²","Lareira a etanol","Ponto para cozinha externa"]'::jsonb, 'Olá! Tenho interesse na cobertura com terraço na Bela Vista.', true, 13, now()),
    (v_org_id, v_site_id, 'casa-auxiliadora', 'Casa de rua na Auxiliadora', 'Casa', 'sale', 'published', 'Quatro dormitórios, dois pavimentos e garagem para dois carros.', 'Casa com fachada preservada e interior atualizado. Os ambientes sociais ficam no térreo, com acesso ao quintal. No pavimento superior, quatro dormitórios, sendo um suíte.', 1650000.00, 'BRL', 'R$ 1.650.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Auxiliadora","label":"Auxiliadora, Porto Alegre"}'::jsonb, '["4 dormitórios","1 suíte","2 vagas","280 m²","Quintal","Fachada preservada"]'::jsonb, 'Olá! Tenho interesse na casa de rua na Auxiliadora.', false, 14, now()),
    (v_org_id, v_site_id, 'sala-centro-historico', 'Sala em edifício histórico no Centro', 'Sala comercial', 'rent', 'published', 'Pé-direito alto, janelas amplas e vista para a rua.', 'Sala em edifício restaurado, com elevador e hall de entrada preservado. O espaço comporta quatro estações e uma mesa de reunião. Ideal para estúdio, escritório ou atendimento.', 4500.00, 'BRL', 'R$ 4.500/mês', '{"city":"Porto Alegre","region":"RS","neighborhood":"Centro Histórico","label":"Centro Histórico, Porto Alegre"}'::jsonb, '["110 m²","Pé-direito alto","2 vagas","Elevador","Edifício restaurado","Vista para a rua"]'::jsonb, 'Olá! Tenho interesse na sala no Centro Histórico.', false, 15, now()),
    (v_org_id, v_site_id, 'apartamento-tristeza', 'Apartamento com vista na Tristeza', 'Apartamento', 'sale', 'published', 'Dois dormitórios, varanda e vista aberta para o rio.', 'Apartamento em andar alto, com varanda voltada para o rio. A sala tem boa profundidade e comporta estar e jantar. Prédio com portaria e uma vaga.', 720000.00, 'BRL', 'R$ 720.000', '{"city":"Porto Alegre","region":"RS","neighborhood":"Tristeza","label":"Tristeza, Porto Alegre"}'::jsonb, '["2 dormitórios","1 banheiro","1 vaga","80 m²","Varanda","Vista para o rio"]'::jsonb, 'Olá! Tenho interesse no apartamento com vista na Tristeza.', false, 16, now())
  on conflict (site_id, slug) do nothing;

  get diagnostics v_inserted = row_count;

  raise notice 'Seed concluído no tenant %: % linha(s) inserida(s)/atualizada(s) de um total de % anúncio(s).',
    v_target_subdomain, v_inserted, 16;
end $$;

select id, slug, title, status, price_label, is_featured, sort_order
from public.property_listings
where site_id = (
  select id from public.sites
  where lower(coalesce(subdomain, '')) = lower('aurora-demo')
  order by updated_at desc
  limit 1
)
order by sort_order;
