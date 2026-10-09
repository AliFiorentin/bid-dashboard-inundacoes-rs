"""
dbc_decode.py -- decodifica arquivos .dbc do DataSUS (DBF comprimido com
PKWare DCL "implode") para .dbf, em Python puro.

Substitui a dependencia de pyreaddbc, que exige um compilador C (MSVC/gcc)
para instalar -- indisponivel em varios ambientes onde este pipeline roda.
Portado linha a linha de blast.c (Mark Adler, dominio publico,
https://github.com/madler/zlib/blob/master/contrib/blast/blast.c) e
dbc2dbf.c (Daniela Petruzalek, AGPLv3, empacotado no pacote pyreaddbc no
PyPI, pyreaddbc/c-src/dbc2dbf.c), preservando a semantica bit a bit exata
dos originais.

Validado byte a byte contra a saida do pyreaddbc real (STRS2404.dbc ->
STRS2404.dbf, 17.867.896 bytes, identico).
"""
from __future__ import annotations

from pathlib import Path

MAXBITS = 13


def _construct(rep: bytes):
    """Expande a lista compacta de comprimentos (repeat-count-encoded) e
    constroi as tabelas (count, symbol) de um codigo de Huffman canonico."""
    length = []
    for b in rep:
        code_len = b & 0x0F
        repeat = (b >> 4) + 1
        length.extend([code_len] * repeat)
    n = len(length)

    count = [0] * (MAXBITS + 1)
    for l in length:
        count[l] += 1
    if count[0] == n:
        return count, []

    left = 1
    for l in range(1, MAXBITS + 1):
        left <<= 1
        left -= count[l]
        if left < 0:
            raise ValueError("dbc_decode: codigo Huffman com excesso de simbolos")

    offs = [0] * (MAXBITS + 2)
    for l in range(1, MAXBITS):
        offs[l + 1] = offs[l] + count[l]

    symbol = [0] * (n - count[0])
    for sym, l in enumerate(length):
        if l != 0:
            symbol[offs[l]] = sym
            offs[l] += 1

    return count, symbol


# Comprimentos (em bits) dos codigos de literais (0..255), de comprimento
# (0..15) e de distancia (0..63), codificados de forma compacta -- copiados
# verbatim de blast.c.
_LITLEN = bytes([
    11, 124, 8, 7, 28, 7, 188, 13, 76, 4, 10, 8, 12, 10, 12, 10, 8, 23, 8,
    9, 7, 6, 7, 8, 7, 6, 55, 8, 23, 24, 12, 11, 7, 9, 11, 12, 6, 7, 22, 5,
    7, 24, 6, 11, 9, 6, 7, 22, 7, 11, 38, 7, 9, 8, 25, 11, 8, 11, 9, 12,
    8, 12, 5, 38, 5, 38, 5, 11, 7, 5, 6, 21, 6, 10, 53, 8, 7, 24, 10, 27,
    44, 253, 253, 253, 252, 252, 252, 13, 12, 45, 12, 45, 12, 61, 12, 45,
    44, 173,
])
_LENLEN = bytes([2, 35, 36, 53, 38, 23])
_DISTLEN = bytes([2, 20, 53, 230, 247, 151, 248])

_LEN_BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264]
_LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]

_LITCOUNT, _LITSYM = _construct(_LITLEN)
_LENCOUNT, _LENSYM = _construct(_LENLEN)
_DISTCOUNT, _DISTSYM = _construct(_DISTLEN)


class DbcDecodeError(Exception):
    pass


class _Reader:
    __slots__ = ("data", "n", "pos", "bitbuf", "bitcnt")

    def __init__(self, data: bytes):
        self.data = data
        self.n = len(data)
        self.pos = 0
        self.bitbuf = 0
        self.bitcnt = 0

    def bits(self, need: int) -> int:
        val = self.bitbuf
        while self.bitcnt < need:
            if self.pos >= self.n:
                raise DbcDecodeError("dbc_decode: fim inesperado do stream (bits)")
            val |= self.data[self.pos] << self.bitcnt
            self.pos += 1
            self.bitcnt += 8
        self.bitbuf = val >> need
        self.bitcnt -= need
        return val & ((1 << need) - 1)

    def decode(self, count, symbol) -> int:
        code = first = index = 0
        length = 1
        bitbuf = self.bitbuf
        left = self.bitcnt
        next_i = 1
        while True:
            while left:
                left -= 1
                code |= (bitbuf & 1) ^ 1
                bitbuf >>= 1
                cnt = count[next_i]
                next_i += 1
                if code < first + cnt:
                    self.bitbuf = bitbuf
                    self.bitcnt = (self.bitcnt - length) & 7
                    return symbol[index + (code - first)]
                index += cnt
                first += cnt
                first <<= 1
                code <<= 1
                length += 1
            left = (MAXBITS + 1) - length
            if left == 0:
                raise DbcDecodeError("dbc_decode: codigo invalido (ran out of codes)")
            if self.pos >= self.n:
                raise DbcDecodeError("dbc_decode: fim inesperado do stream (decode)")
            bitbuf = self.data[self.pos]
            self.pos += 1
            if left > 8:
                left = 8


def _blast_decompress(data: bytes) -> bytes:
    """Descomprime um stream PKWare DCL implode (o payload apos o cabecalho
    DBF + CRC32 no arquivo .dbc, ver dbc_to_dbf)."""
    r = _Reader(data)
    lit = r.bits(8)
    if lit > 1:
        raise DbcDecodeError(f"dbc_decode: flag de literal invalida ({lit})")
    dict_bits = r.bits(8)
    if dict_bits < 4 or dict_bits > 6:
        raise DbcDecodeError(f"dbc_decode: tamanho de dicionario invalido ({dict_bits})")

    out = bytearray()
    while True:
        if r.bits(1):
            symbol = r.decode(_LENCOUNT, _LENSYM)
            length = _LEN_BASE[symbol] + r.bits(_LEN_EXTRA[symbol])
            if length == 519:
                break
            sym2 = 2 if length == 2 else dict_bits
            dist = (r.decode(_DISTCOUNT, _DISTSYM) << sym2) + r.bits(sym2) + 1
            if dist > len(out):
                raise DbcDecodeError("dbc_decode: distancia de copia alem do buffer")
            start = len(out) - dist
            for i in range(length):
                out.append(out[start + i])
        else:
            symbol = r.decode(_LITCOUNT, _LITSYM) if lit else r.bits(8)
            out.append(symbol)
    return bytes(out)


def dbc_to_dbf(dbc_path: str | Path, dbf_path: str | Path) -> None:
    """Decodifica um .dbc do DataSUS para .dbf (mesmo formato de saida do
    pyreaddbc.dbc2dbf): copia o cabecalho DBF verbatim (com o byte
    terminador forcado para 0x0D), pula os 4 bytes de CRC32, e descomprime
    o restante do arquivo com o algoritmo PKWare DCL implode."""
    dbc_path = Path(dbc_path)
    dbf_path = Path(dbf_path)
    raw = dbc_path.read_bytes()

    header_len = raw[8] | (raw[9] << 8)
    if header_len < 32:
        raise DbcDecodeError(f"dbc_decode: tamanho de cabecalho implausivel em {dbc_path}: {header_len}")

    header = bytearray(raw[:header_len])
    header[-1] = 0x0D
    payload = raw[header_len + 4:]

    body = _blast_decompress(payload)

    with open(dbf_path, "wb") as f:
        f.write(header)
        f.write(body)
