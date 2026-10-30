import { describe, expect, it } from 'vitest'
import { errorMessage } from './api'

// Os erros abaixo são os que o FastAPI devolve de verdade num 422 (tipo, loc e ctx copiados
// de uma resposta real); o `msg` em inglês é o que a tela não deve mostrar.
describe('errorMessage', () => {
  it('repassa o detalhe que o servidor já escreveu em português', () => {
    expect(errorMessage('Renda não encontrada.')).toBe('Renda não encontrada.')
  })

  it('sem detalhe, cai na mensagem genérica', () => {
    expect(errorMessage(undefined)).toBe('Não deu para completar a operação.')
    expect(errorMessage([])).toBe('Não deu para completar a operação.')
  })

  it('campo obrigatório ausente ou vazio pede para preencher', () => {
    expect(errorMessage([{ type: 'missing', loc: ['body', 'password'], msg: 'Field required' }]))
      .toBe('Preencha o campo Senha.')
    expect(errorMessage([{ type: 'string_too_short', loc: ['body', 'description'], ctx: { min_length: 1 } }]))
      .toBe('Preencha o campo Descrição.')
  })

  it('limites numéricos dizem o limite', () => {
    expect(errorMessage([{ type: 'greater_than', loc: ['body', 'amount'], ctx: { gt: 0 } }]))
      .toBe('Valor precisa ser maior que 0.')
    expect(errorMessage([{ type: 'greater_than_equal', loc: ['body', 'amount'], ctx: { ge: 0 } }]))
      .toBe('Valor precisa ser 0 ou mais.')
    expect(errorMessage([{ type: 'less_than_equal', loc: ['body', 'closing_day'], ctx: { le: 28 } }]))
      .toBe('Dia de fechamento precisa ser 28 ou menos.')
  })

  // o teto de Numeric(12,2): antes desta mensagem, a tela mostrava "[object Object]"
  it('valor acima da coluna diz que é grande demais', () => {
    expect(errorMessage([{ type: 'decimal_whole_digits', loc: ['body', 'amount'], ctx: { whole_digits: 10 } }]))
      .toBe('Valor grande demais.')
  })

  it('mês fora do padrão aponta o campo', () => {
    expect(errorMessage([{ type: 'string_pattern_mismatch', loc: ['path', 'month'] }]))
      .toBe('Mês: valor inválido.')
  })

  it('vários erros viram uma frase cada, sem repetir', () => {
    expect(
      errorMessage([
        { type: 'missing', loc: ['body', 'date'] },
        { type: 'missing', loc: ['body', 'date'] },
        { type: 'less_than_equal', loc: ['body', 'installments'], ctx: { le: 48 } },
      ]),
    ).toBe('Preencha o campo Data. Parcelas precisa ser 48 ou menos.')
  })

  it('campo sem nome conhecido cai numa frase genérica, nunca em "[object Object]"', () => {
    expect(errorMessage([{ type: 'value_error', loc: ['body'] }]))
      .toBe('Algum campo foi recusado. Confira os valores.')
  })
})
