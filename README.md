# Buy / sell site
The idea is to build a site for buying and selling products (like Mercado Libre or Ebay) using smart contracts.
The difference is that the items for sale will be auctioned and would not have a fixed sale amount.   And when a bid is made, there would be the option to give a maximum value to allow automatic bids (as can be done on some auction sites).

The usage would be as follows:

* An item is registered for sale (e.g. a chair).  It must indicate a base price, an achievable price (optional, in case you want to have a limit) and references to additional information (detail, photos, etc).  The verification hash of the saved elements can be saved in an external site.

* The system allows offers on an item for sale. It contains a value to be paid and optionally a maximum value to be received.   In this case:
  * If the value is less than the current bid, it is ignored.
  * If the value to be paid improves the current bid or the value is lower but the maximum amount exceeds the maximum of the current bid, the current bid will remain as the best value.  In this case, the value charged to the previous bid will be refunded and the maximum bid of the order will be taken.

* Either because a deadline has passed or because of the seller's will, the offer ends and the amount of the current offer will be transferred to the seller.   If there is a difference between the maximum bid and the purchase bid, it will be refunded to the buyer.


## Sitio de compra / venta 
La idea es construir un sitio de compra y ventas de productos (como Mercado Libre o Ebay) utilizando _smart contracts_.
La diferencia es que los elementos en venta se subastarán y no tendrían un monto de venta fijo.  Y cuando se haga una oferta, estará la opción de dar un valor máximo para permitir ofertas automáticas (como se puede hacer en algunos sitios de subastas).

El uso sería el siguiente:

* Se registra un elemento a la venta (por ejemplo, una silla).  Se debe indicar un precio base, un precio alcanzable (opcional, por si se desea tener un límite) y referencias sobre información adicional (detalle, fotos, etc).  Se esto último se puede guardar el hash de verificación de los elementos guardados en un sitio externo.

* El sistema permite ofertas sobre un elemento en venta.  La misma contiene un valor a pagar y opcionalmente un valor máximo que debe ser recibido.  En este caso:
  * Si el valor es menor que la oferta actual, se ignora.
  * Si el valor a pagar mejora la oferta actual o el valor es menor pero el monto máximo supera el máximo de la oferta actual, esta quedará como mejor valor.  En este caso, se reintegrará el valor cobrado a la oferta anterior y se tomara la oferta máxima del pedido.

* Ya sea porque paso un plazo establecido o por voluntad del usuario vendedor, la oferta termina y se le transfiere el monto de la oferta actual.   Si quedó diferencia entre la oferta máxima y la de compra, se le reintegrará a la parte compradora.

Agradezco a www.DeepL.com/Translator por la traducción.
