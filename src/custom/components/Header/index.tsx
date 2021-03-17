import HeaderMod, { UniIcon } from './HeaderMod'
import styled from 'styled-components'
export { NETWORK_LABELS } from './HeaderMod'

export const Header = styled(HeaderMod)`
  border-bottom: 1px solid ${({ theme }) => theme.header?.border};

  ${UniIcon} {
    display: flex;
  }
`

export const LogoImage = styled.img.attrs(props => ({
  src: props.theme.logo.src,
  alt: props.theme.logo.alt,
  width: props.theme.logo.width,
  height: props.theme.logo.height
}))`
  object-fit: contain;
`

export default Header
