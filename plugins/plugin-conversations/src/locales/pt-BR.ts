export const ptBR: Record<string, string> = {
  'conversations.title': 'Conversas',
  'conversations.subtitle': 'Caixa de entrada unificada de todos os canais',

  // Lista de conversas
  'conversations.list.search': 'Buscar conversas',
  'conversations.list.loading': 'Carregando…',
  'conversations.list.empty': 'Nenhuma conversa',
  'conversations.list.new': 'Nova conversa',

  // Filtros de canal
  'conversations.filter.all': 'Todas',
  'conversations.filter.whatsapp': 'WhatsApp',
  'conversations.filter.sms': 'SMS',
  'conversations.filter.instagram': 'Instagram',
  'conversations.filter.email': 'E-mail',
  'conversations.filter.webchat': 'Web',

  // Rótulos de status
  'conversations.status.open': 'Aberta',
  'conversations.status.snoozed': 'Adiada',
  'conversations.status.closed': 'Encerrada',

  // Estado vazio
  'conversations.empty.select': 'Selecione uma conversa para começar a conversar',

  // Thread
  'conversations.thread.back': 'Voltar às conversas',
  'conversations.thread.snooze': 'Adiar',
  'conversations.thread.close': 'Encerrar',
  'conversations.thread.details': 'Alternar detalhes do contato',
  'conversations.thread.empty': 'Nenhuma mensagem ainda',
  'conversations.thread.reply': 'Responder via {{channel}}…',
  'conversations.thread.send': 'Enviar',

  // Painel do contato
  'conversations.contact.details': 'Detalhes',
  'conversations.contact.closeDetails': 'Fechar detalhes',
  'conversations.contact.channel': 'Canal',
  'conversations.contact.status': 'Status',
  'conversations.contact.assignedTo': 'Responsável',
  'conversations.contact.location': 'Localização',
  'conversations.contact.tags': 'Etiquetas',
  'conversations.contact.note': 'Nota',
  'conversations.contact.linkedRecords': 'Registros vinculados',
  'conversations.contact.noLinkedRecords': 'Nenhum registro vinculado ainda.',

  // Modal de nova conversa
  'conversations.new.title': 'Nova conversa',
  'conversations.new.channel': 'Canal',
  'conversations.new.contactName': 'Nome do contato',
  'conversations.new.contactNamePlaceholder': 'ex.: Maria Silva',
  'conversations.new.handle': 'Telefone / usuário / e-mail',
  'conversations.new.handlePlaceholder': '+55 11 99999-0000',
  // O campo de handle só aparece quando o contato escolhido não tem o dado do
  // canal ativo — caso contrário ele é derivado e mostrado no chip.
  'conversations.new.addHandle': 'Adicionar {label}',
  'conversations.new.handleLabel.phone': 'telefone',
  'conversations.new.handleLabel.email': 'e-mail',
  'conversations.new.handleLabel.instagram': '@ do Instagram',
  'conversations.new.handleLabel.webchat': 'id do chat',
  'conversations.new.firstMessage': 'Primeira mensagem',
  'conversations.new.firstMessagePlaceholder': 'Escreva a primeira mensagem (opcional)…',
  'conversations.new.cancel': 'Cancelar',
  'conversations.new.create': 'Iniciar conversa',
  'conversations.new.creating': 'Iniciando…',
  'conversations.new.createFailed': 'Não foi possível criar a conversa',
}
